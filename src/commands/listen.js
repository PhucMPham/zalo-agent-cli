/**
 * Unified listener — combines message, friend, and group events in one WebSocket connection.
 * Production-ready with auto-reconnect and re-login.
 */

import { getApi, autoLogin, clearSession } from "../core/zalo-client.js";
import { success, error, info, warning } from "../utils/output.js";

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
        .action(async (opts) => {
            const jsonMode = program.opts().json;
            const startTime = Date.now();
            let reconnectCount = 0;
            let eventCount = 0;
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
                }).catch(() => {});
            }

            /** Output event as JSON or human-readable, then post to webhook */
            function emitEvent(data, humanMsg) {
                eventCount++;
                if (jsonMode) {
                    console.log(JSON.stringify(data));
                } else {
                    info(humanMsg);
                }
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

                        const content = typeof msg.data.content === "string" ? msg.data.content : "[non-text]";
                        const data = {
                            event: "message",
                            msgId: msg.data.msgId,
                            cliMsgId: msg.data.cliMsgId,
                            threadId: msg.threadId,
                            type: msg.type,
                            isSelf: msg.isSelf,
                            content,
                        };
                        const dir = msg.isSelf ? "→" : "←";
                        const typeLabel = msg.type === THREAD_USER ? "DM" : "GR";
                        emitEvent(
                            data,
                            `${dir} [${typeLabel}] [${msg.threadId}] ${content}  (msgId: ${msg.data.msgId})`,
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
                    warning(`Disconnected (code: ${code}). Auto-retrying...`);
                });

                api.listener.on("closed", async (code, _reason) => {
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
            try {
                const api = getApi();
                attachAllHandlers(api);
                api.listener.start({ retryOnClose: true });

                info("Listening for Zalo events... Press Ctrl+C to stop.");
                info(`Events: ${opts.events}`);
                info("Auto-reconnect enabled.");
                if (opts.filter !== "all") info(`Message filter: ${opts.filter}`);
                if (opts.webhook) info(`Webhook: ${opts.webhook}`);
                if (opts.autoAccept) info("Auto-accept friend requests: ON");
            } catch (e) {
                error(`Listen failed: ${e.message}`);
                process.exit(1);
            }

            // Keep alive until Ctrl+C
            await new Promise((resolve) => {
                process.on("SIGINT", () => {
                    try {
                        getApi().listener.stop();
                    } catch {}
                    info(`Stopped. Uptime: ${uptime()}, events: ${eventCount}, reconnects: ${reconnectCount}`);
                    resolve();
                });
            });
        });
}
