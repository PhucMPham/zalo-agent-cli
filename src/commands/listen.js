/**
 * Unified listener — combines message, friend, and group events in one WebSocket connection.
 * Production-ready with auto-reconnect and re-login.
 */

import { appendFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { getApi, autoLogin, clearSession } from "../core/zalo-client.js";
import { success, error, info, warning } from "../utils/output.js";
import { startControlServer } from "../utils/control-server.js";
import { extractReplyTo } from "../mcp/message-normalize.js";

/** Thread types matching zca-js ThreadType enum */
const THREAD_USER = 0;
const THREAD_GROUP = 1;

/** Friend event type → readable label (matches zca-js FriendEventType enum order) */
const FRIEND_EVENT_LABELS = {
    0: "friend_added",
    1: "friend_removed",
    2: "friend_request",
    3: "undo_request",
    4: "reject_request",
    5: "seen_request",
    6: "blocked",
    7: "unblocked",
};
const FRIEND_REQUEST_TYPE = 2;

/** Zalo close code for duplicate web session */
const CLOSE_DUPLICATE = 3000;

export function registerListenCommand(program) {
    program
        .command("listen")
        .description(
            "Listen for all Zalo events (messages, friend requests, group events) via one WebSocket. Auto-reconnect enabled.",
        )
        .option(
            "-e, --events <types>",
            "Comma-separated event types: message,friend,group,reaction (default: message,friend)",
            "message,friend",
        )
        .option("-f, --filter <type>", "Message filter: user (DM only), group (groups only), all", "all")
        .option("-w, --webhook <url>", "POST each event as JSON to this URL (for n8n, Make, etc.)")
        .option("--no-self", "Exclude self-sent messages")
        .option("--auto-accept", "Auto-accept incoming friend requests")
        .option("--save <dir>", "Save messages locally as JSONL files (one file per thread, e.g. --save ./zalo-logs)")
        .option(
            "--control-port <port>",
            "Serve POST /send-file on 127.0.0.1:<port> so files send through this listener (needed for non-image files)",
        )
        .action(async (opts) => {
            const jsonMode = program.opts().json;
            const startTime = Date.now();
            let reconnectCount = 0;
            let eventCount = 0;
            let shuttingDown = false;
            const enabledEvents = new Set(opts.events.split(",").map((e) => e.trim()));

            function uptime() {
                const s = Math.floor((Date.now() - startTime) / 1000);
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                return h > 0 ? `${h}h${m}m` : `${m}m${s % 60}s`;
            }

            /** Fire-and-forget webhook POST — never blocks event processing */
            function postWebhook(data) {
                if (!opts.webhook) return;
                fetch(opts.webhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                    signal: AbortSignal.timeout(5000),
                }).catch((e) => {
                    console.error(`[listen] Webhook failed: ${e.message}`);
                });
            }

            // Setup save directory if --save flag provided
            let saveDir = null;
            if (opts.save) {
                saveDir = resolve(opts.save);
                if (!existsSync(saveDir)) mkdirSync(saveDir, { recursive: true });
                info(`Saving messages to: ${saveDir}`);
            }

            /** Append event to JSONL file (one file per threadId) */
            function saveEvent(data) {
                if (!saveDir || !data.threadId) return;
                const filename = `${data.threadId}.jsonl`;
                const filepath = join(saveDir, filename);
                const line = JSON.stringify({ ...data, savedAt: new Date().toISOString() }) + "\n";
                try {
                    appendFileSync(filepath, line, "utf-8");
                } catch (e) {
                    console.error(`[listen] Save failed: ${e.message}`);
                }
            }

            /** Output event as JSON or human-readable, save locally, then post to webhook */
            function emitEvent(data, humanMsg) {
                eventCount++;
                if (jsonMode) {
                    console.log(JSON.stringify(data));
                } else {
                    info(humanMsg);
                }
                saveEvent(data);
                postWebhook(data);
            }

            /** Attach ALL handlers (data + lifecycle) to current API listener */
            function attachAllHandlers(api) {
                // --- Message events ---
                if (enabledEvents.has("message")) {
                    api.listener.on("message", async (msg) => {
                        if (opts.filter === "user" && msg.type !== THREAD_USER) return;
                        if (opts.filter === "group" && msg.type !== THREAD_GROUP) return;
                        if (!opts.self && msg.isSelf) return;

                        const rawContent = msg.data.content;
                        const isText = typeof rawContent === "string";
                        const msgType = msg.data.msgType || null;
                        // Build readable display: show type + title/href for non-text
                        let displayContent;
                        if (isText) {
                            displayContent = rawContent;
                        } else if (rawContent && typeof rawContent === "object") {
                            const parts = [msgType || "attachment"];
                            if (rawContent.title) parts.push(`"${rawContent.title}"`);
                            if (rawContent.href) parts.push(rawContent.href);
                            displayContent = `[${parts.join(" | ")}]`;
                        } else {
                            displayContent = `[${msgType || "non-text"}]`;
                        }
                        const data = {
                            event: "message",
                            msgId: msg.data.msgId,
                            cliMsgId: msg.data.cliMsgId,
                            threadId: msg.threadId,
                            type: msg.type,
                            isSelf: msg.isSelf,
                            uidFrom: msg.data.uidFrom || null,
                            dName: msg.data.dName || null,
                            msgType,
                            content: rawContent,
                            replyTo: extractReplyTo(msg),
                        };
                        const dir = msg.isSelf ? "→" : "←";
                        const typeLabel = msg.type === THREAD_USER ? "DM" : "GR";
                        emitEvent(
                            data,
                            `${dir} [${typeLabel}] [${msg.threadId}] ${displayContent}  (msgId: ${msg.data.msgId})`,
                        );
                    });
                }

                // --- Friend events ---
                if (enabledEvents.has("friend")) {
                    api.listener.on("friend_event", async (event) => {
                        const label = FRIEND_EVENT_LABELS[event.type] || "friend_unknown";
                        const data = {
                            event: label,
                            threadId: event.threadId,
                            isSelf: event.isSelf,
                            data: event.data,
                        };
                        const humanMsg =
                            event.type === FRIEND_REQUEST_TYPE
                                ? `Friend request from ${event.data.fromUid}: "${event.data.message || ""}"`
                                : `${label} — ${event.threadId}`;
                        emitEvent(data, humanMsg);

                        // Auto-accept incoming friend requests
                        if (opts.autoAccept && event.type === FRIEND_REQUEST_TYPE && !event.isSelf) {
                            try {
                                await api.acceptFriendRequest(event.data.fromUid);
                                success(`Auto-accepted friend request from ${event.data.fromUid}`);
                            } catch (e) {
                                error(`Auto-accept failed: ${e.message}`);
                            }
                        }
                    });
                }

                // --- Group events ---
                if (enabledEvents.has("group")) {
                    api.listener.on("group_event", (event) => {
                        emitEvent(
                            {
                                event: `group_${event.type}`,
                                threadId: event.threadId,
                                isSelf: event.isSelf,
                                data: event.data,
                            },
                            `Group: ${event.type} — ${event.threadId}`,
                        );
                    });
                }

                // --- Reaction events ---
                if (enabledEvents.has("reaction")) {
                    api.listener.on("reaction", (reaction) => {
                        if (!opts.self && reaction.isSelf) return;
                        emitEvent(
                            {
                                event: "reaction",
                                threadId: reaction.threadId,
                                isSelf: reaction.isSelf,
                                isGroup: reaction.isGroup,
                                data: reaction.data,
                            },
                            `Reaction in ${reaction.threadId}`,
                        );
                    });
                }

                // --- Lifecycle events (MUST be on same listener for reconnect to work) ---
                api.listener.on("connected", () => {
                    if (reconnectCount > 0) {
                        info(`Reconnected (#${reconnectCount}, uptime: ${uptime()}, events: ${eventCount})`);
                    }
                });

                api.listener.on("disconnected", (code, _reason) => {
                    if (shuttingDown) return;
                    warning(`Disconnected (code: ${code}). Auto-retrying...`);
                });

                api.listener.on("closed", async (code, _reason) => {
                    // Ctrl+C stops the listener, which fires this event — don't re-login.
                    if (shuttingDown) return;
                    if (code === CLOSE_DUPLICATE) {
                        error("Another Zalo Web session opened. Listener stopped.");
                        process.exit(1);
                    }
                    reconnectCount++;
                    warning(`Connection closed (code: ${code}). Re-login in 5s... (uptime: ${uptime()})`);
                    await new Promise((r) => setTimeout(r, 5000));
                    try {
                        clearSession();
                        await autoLogin(jsonMode);
                        info("Re-login successful. Restarting listener...");
                        // Attach ALL handlers to the NEW api (including lifecycle)
                        const newApi = getApi();
                        attachAllHandlers(newApi);
                        newApi.listener.start({ retryOnClose: true });
                    } catch (e) {
                        error(`Re-login failed: ${e.message}. Retrying in 30s...`);
                        await new Promise((r) => setTimeout(r, 30000));
                        try {
                            clearSession();
                            await autoLogin(jsonMode);
                            const retryApi = getApi();
                            attachAllHandlers(retryApi);
                            retryApi.listener.start({ retryOnClose: true });
                            info("Re-login successful on retry.");
                        } catch (e2) {
                            error(`Re-login retry failed: ${e2.message}. Exiting.`);
                            process.exit(1);
                        }
                    }
                });

                api.listener.on("error", (_err) => {
                    // WS errors are followed by close/disconnect — don't crash
                });
            }

            // --- Initial start ---
            let controlServer = null;
            try {
                // Bind before starting the listener: a bad or busy port must fail without
                // having opened a WebSocket session that kicks the account's other session.
                if (opts.controlPort !== undefined) {
                    const port = Number(opts.controlPort);
                    if (!Number.isInteger(port) || port < 1 || port > 65535) {
                        throw new Error(`Invalid --control-port: ${opts.controlPort} (expected 1-65535)`);
                    }
                    controlServer = await startControlServer(port, getApi);
                }

                const api = getApi();
                attachAllHandlers(api);
                api.listener.start({ retryOnClose: true });

                info("Listening for Zalo events... Press Ctrl+C to stop.");
                info(`Events: ${opts.events}`);
                info("Auto-reconnect enabled.");
                if (opts.filter !== "all") info(`Message filter: ${opts.filter}`);
                if (opts.webhook) info(`Webhook: ${opts.webhook}`);
                if (saveDir) info(`Save dir: ${saveDir} (JSONL per thread)`);
                if (opts.autoAccept) info("Auto-accept friend requests: ON");
                if (controlServer) {
                    info(`Control endpoint: POST http://127.0.0.1:${controlServer.address().port}/send-file`);
                }
            } catch (e) {
                error(`Listen failed: ${e.message}`);
                process.exit(1);
            }

            // Keep alive until Ctrl+C
            await new Promise((resolve) => {
                process.once("SIGINT", () => {
                    shuttingDown = true;
                    try {
                        getApi().listener.stop();
                    } catch (e) {
                        console.error(`[listen] Stop failed: ${e.message}`);
                    }
                    controlServer?.close();
                    info(`Stopped. Uptime: ${uptime()}, events: ${eventCount}, reconnects: ${reconnectCount}`);
                    if (saveDir) info(`Messages saved to: ${saveDir}`);
                    resolve();
                    // Listener + pending timers keep the event loop alive — force exit.
                    process.exit(0);
                });
            });
        });
}
