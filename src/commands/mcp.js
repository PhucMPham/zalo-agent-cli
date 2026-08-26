/**
 * MCP server command — starts a Model Context Protocol server over stdio transport.
 * Allows Claude Code and other MCP clients to read/send Zalo messages via tool calls.
 *
 * IMPORTANT: All diagnostic output uses console.error() — stdout is the MCP transport channel.
 */

import { getApi, autoLogin, clearSession } from "../core/zalo-client.js";
import { MessageBuffer } from "../mcp/message-buffer.js";
import { HistoryStore } from "../mcp/history-store.js";
import { reconnectDelay } from "../mcp/reconnect.js";
import { ThreadFilter } from "../mcp/thread-filter.js";
import { loadMCPConfig, parseDuration } from "../mcp/mcp-config.js";
import { normalizeMessage, toHistoryMessage } from "../mcp/message-normalize.js";
import { createMCPServer } from "../mcp/mcp-server.js";
import { registerTools } from "../mcp/mcp-tools.js";
import { createHTTPServer } from "../mcp/mcp-http-transport.js";
import { ZaloNotifier } from "../mcp/notifier.js";
import { ThreadNameCache } from "../mcp/thread-name-cache.js";
import { autoDownloadMedia, isDownloadableMedia } from "../mcp/media-downloader.js";

/** Zalo close code for duplicate web session — fatal, do not retry */
const CLOSE_DUPLICATE = 3000;

/** Reconnect backoff tuning. */
const STABLE_CONNECTION_MS = 60 * 1000; // a connection lasting this long is "healthy"
const THRASH_WARN_AT = 3; // consecutive rapid closes before warning about multi-session conflict

export function registerMCPCommands(program) {
    const mcp = program.command("mcp").description("MCP server for AI agent integration");

    mcp.command("start")
        .description("Start MCP server (stdio or HTTP transport)")
        .option("--config <path>", "Config file path (default: ~/.zalo-agent-cli/mcp-config.json)")
        .option("--http <port>", "Use HTTP transport on specified port (default: stdio)")
        .option("--auth <token>", "Bearer token for HTTP auth (only with --http)")
        .option("--host <address>", "HTTP bind address (default: 127.0.0.1, only with --http)")
        .action(async (opts) => {
            // Perform login explicitly here — preAction hook skips "mcp".
            // jsonMode=true: Auto-login banner must not touch stdout (JSON-RPC).
            try {
                await autoLogin(true);
            } catch (e) {
                console.error("[mcp] Auto-login failed:", e.message);
                process.exit(1);
            }

            // Load MCP config (config path option reserved for future use)
            const config = loadMCPConfig();
            console.error("[mcp] Config loaded:", JSON.stringify(config.limits));

            // Build buffer + filter from config
            const maxAge = parseDuration(config.limits?.bufferMaxAge ?? "2h");
            const maxSize = config.limits?.bufferMaxSize ?? 500;
            const buffer = new MessageBuffer(maxSize, maxAge);
            const filter = new ThreadFilter(config);

            // History store — seeded from old-message backfill at (re)connect, grows with live messages.
            const historyStore = new HistoryStore(config.limits?.historyMaxPerThread ?? 2000);
            const backfillPages = config.limits?.historyBackfillPages ?? 5;
            const backfillPageTimeout = parseDuration(config.limits?.historyBackfillPageTimeout ?? "8s");

            // Build thread name cache (groups + friends → in-memory index)
            const nameCache = new ThreadNameCache();
            try {
                await nameCache.init(getApi());
            } catch (e) {
                console.error("[mcp] Thread name cache init failed (non-fatal):", e.message);
            }

            // Start MCP server — stdio (default) or HTTP
            let httpServer = null;
            try {
                if (opts.http) {
                    const port = Number(opts.http);
                    if (!Number.isInteger(port) || port < 1 || port > 65535) {
                        console.error(`[mcp] Invalid port: ${opts.http}. Must be 1-65535.`);
                        process.exit(1);
                    }
                    const deps = { api: getApi(), buffer, filter, config, nameCache, historyStore };
                    const authToken = opts.auth?.trim() || null;
                    httpServer = createHTTPServer(registerTools, deps, port, authToken, opts.host || "127.0.0.1");
                    console.error(`[mcp] HTTP server started on port ${port}`);
                } else {
                    await createMCPServer(getApi(), buffer, filter, config, nameCache, historyStore);
                }
            } catch (e) {
                console.error("[mcp] Failed to start MCP server:", e.message);
                process.exit(1);
            }

            // Setup notifier (sends to Zalo group when agent is offline)
            const notifier = new ZaloNotifier(getApi(), config);

            let reconnectCount = 0;
            let shuttingDown = false;
            let backfillGeneration = 0; // bumped each connect; older in-flight backfills bail when superseded
            let lastConnectedAt = 0; // ms timestamp of the last successful connect (0 = not connected)
            let rapidCloses = 0; // consecutive closes that happened before the connection was stable
            let warnedMultiSession = false; // one-shot guard for the multi-session warning

            /**
             * Fetch old messages for one thread type via the WebSocket backfill (cmd 510/511),
             * paginating up to `maxPages`, and ingest them into the history store.
             *
             * Zalo only replays old messages during a connection's sync window, so this MUST run
             * right after "connected" (not lazily on demand — that returns empty on a live socket).
             * @param {object} api - zca-js API instance
             * @param {number} threadType - 0=User(DM), 1=Group
             * @param {number} gen - Backfill generation; the run bails if a newer connect supersedes it
             * @returns {Promise<number>} Count of messages ingested
             */
            async function backfillHistory(api, threadType, gen) {
                let cursor = null;
                let ingested = 0;
                for (let page = 0; page < backfillPages; page++) {
                    if (gen !== backfillGeneration) break; // superseded by a newer connect
                    const batch = await new Promise((resolve) => {
                        const handler = (messages, type) => {
                            if (type !== threadType) return; // wait for our thread type
                            clearTimeout(timer);
                            api.listener.removeListener("old_messages", handler);
                            resolve(Array.isArray(messages) ? messages : []);
                        };
                        const timer = setTimeout(() => {
                            api.listener.removeListener("old_messages", handler);
                            resolve([]);
                        }, backfillPageTimeout);
                        api.listener.on("old_messages", handler);
                        try {
                            api.listener.requestOldMessages(threadType, cursor);
                        } catch {
                            clearTimeout(timer);
                            api.listener.removeListener("old_messages", handler);
                            resolve([]);
                        }
                    });

                    if (gen !== backfillGeneration) break; // superseded while awaiting this page
                    if (batch.length === 0) break;

                    // Backfill batches span all threads of this type — group by threadId.
                    const byThread = new Map();
                    for (const raw of batch) {
                        const hm = toHistoryMessage(raw);
                        if (!hm.threadId || !hm.msgId) continue;
                        if (!byThread.has(hm.threadId)) byThread.set(hm.threadId, []);
                        byThread.get(hm.threadId).push(hm);
                    }
                    for (const [tid, msgs] of byThread) ingested += historyStore.ingest(tid, msgs);

                    // Cursor is a GLOBAL backfill cursor (last id of the whole batch across all
                    // threads), not per-thread — that's how Zalo's requestOldMessages(lastId) paginates.
                    const last = batch[batch.length - 1];
                    const nextId = last?.data?.actionId || last?.data?.msgId;
                    if (!nextId || String(nextId) === String(cursor)) break;
                    cursor = nextId;
                }
                return ingested;
            }

            /**
             * Seed the history store from the backfill right after (re)connect.
             *
             * Each connect supersedes any older in-flight backfill (which may still be looping
             * against a now-dead socket): we bump the generation and start a fresh run immediately,
             * so the new connection's sync window — the only time Zalo replays old messages — is
             * never skipped. The stale run bails on its next generation check.
             * Runs DM then Group sequentially to avoid old_messages cross-talk; failures are non-fatal.
             * @param {object} api - zca-js API instance
             */
            async function primeHistoryOnConnect(api) {
                const gen = ++backfillGeneration;
                try {
                    const dm = await backfillHistory(api, 0, gen);
                    const group = await backfillHistory(api, 1, gen);
                    if (gen === backfillGeneration) {
                        console.error(
                            `[mcp] History backfill: ${dm} DM + ${group} group message(s) across ${historyStore.threadIds().length} thread(s)`,
                        );
                    }
                } catch (e) {
                    console.error("[mcp] History backfill failed (non-fatal):", e.message);
                }
            }

            /**
             * Attach Zalo listener handlers to the current API instance.
             * Must be called again after each re-login with the new API instance.
             * @param {object} api - zca-js API instance
             */
            function attachListenerHandlers(api) {
                api.listener.on("message", (msg) => {
                    // Record into history first (complete view: includes self, real timestamps)
                    try {
                        const hm = toHistoryMessage(msg);
                        if (hm.threadId && hm.msgId) historyStore.ingest(hm.threadId, [hm]);
                    } catch {
                        // Non-fatal — history ingest must never break live handling
                    }

                    // Skip self-sent messages for the live agent buffer
                    if (msg.isSelf) return;

                    const normalized = normalizeMessage(msg);

                    // Apply thread watch filter
                    if (!filter.shouldWatch(normalized.threadId, normalized.threadType)) return;

                    // Apply noise filter (stickers, system msgs, short emoji)
                    if (!filter.shouldKeep(normalized)) return;

                    // Auto-download media (images, audio, video) in background
                    if (normalized.attachment?.url && isDownloadableMedia(normalized.type)) {
                        const threadName = nameCache?.get(normalized.threadId)?.name || null;
                        autoDownloadMedia(normalized, {
                            downloadDir: config.media?.downloadDir || undefined,
                            threadName,
                        });
                    }

                    buffer.push(normalized.threadId, normalized);
                    notifier.onMessage(normalized);
                    console.error(`[mcp] Buffered ${normalized.threadType} msg from ${normalized.threadId}`);
                });

                api.listener.on("connected", () => {
                    if (reconnectCount > 0) {
                        console.error(`[mcp] Reconnected (#${reconnectCount})`);
                    }
                    lastConnectedAt = Date.now();
                    // Seed history from the server backfill while inside the sync window.
                    primeHistoryOnConnect(api);
                });

                api.listener.on("disconnected", (code) => {
                    if (shuttingDown) return;
                    console.error(`[mcp] Disconnected (code: ${code}). Auto-retrying...`);
                });

                api.listener.on("closed", async (code) => {
                    // Ctrl+C stops the listener, which fires this event — don't re-login.
                    if (shuttingDown) return;
                    if (code === CLOSE_DUPLICATE) {
                        console.error("[mcp] Duplicate Zalo Web session detected. Exiting.");
                        process.exit(1);
                    }
                    reconnectCount++;

                    // Thrash detection. A connection that dies quickly after connecting usually
                    // means another Zalo web session is evicting us — Zalo signals this with a
                    // plain code-1000 close, not the 3000 duplicate frame. Back off exponentially
                    // instead of hammering every 5s, but never give up: this self-heals if the
                    // rival session goes away.
                    const uptime = lastConnectedAt ? Date.now() - lastConnectedAt : 0;
                    if (lastConnectedAt && uptime >= STABLE_CONNECTION_MS) {
                        rapidCloses = 0; // a healthy connection dropped — normal reconnect
                        warnedMultiSession = false;
                    } else {
                        rapidCloses++;
                    }
                    lastConnectedAt = 0;

                    const delay = reconnectDelay(rapidCloses);

                    if (rapidCloses >= THRASH_WARN_AT && !warnedMultiSession) {
                        warnedMultiSession = true;
                        console.error(
                            `[mcp] Rapid reconnects (code ${code}) — another Zalo web session is likely active. ` +
                                "Run only ONE Claude client's Zalo MCP server at a time (Claude Code OR the desktop app); " +
                                "the native Zalo app is fine. Backing off to avoid an eviction loop.",
                        );
                    }

                    console.error(
                        `[mcp] Connection closed (code: ${code}). Re-login in ${Math.round(delay / 1000)}s... ` +
                            `(reconnect #${reconnectCount}, rapid #${rapidCloses})`,
                    );
                    await new Promise((r) => setTimeout(r, delay));
                    try {
                        clearSession();
                        await autoLogin(true);
                        console.error("[mcp] Re-login successful. Restarting listener...");
                        const newApi = getApi();
                        attachListenerHandlers(newApi);
                        newApi.listener.start({ retryOnClose: true });
                    } catch (e) {
                        console.error(`[mcp] Re-login failed: ${e.message}. Retrying in 30s...`);
                        await new Promise((r) => setTimeout(r, 30000));
                        try {
                            clearSession();
                            await autoLogin(true);
                            const retryApi = getApi();
                            attachListenerHandlers(retryApi);
                            retryApi.listener.start({ retryOnClose: true });
                            console.error("[mcp] Re-login successful on retry.");
                        } catch (e2) {
                            console.error(`[mcp] Re-login retry failed: ${e2.message}. Exiting.`);
                            process.exit(1);
                        }
                    }
                });

                api.listener.on("error", () => {
                    // WS errors are followed by close/disconnect — suppress to avoid noise
                });
            }

            // Wire listener and start
            try {
                const api = getApi();
                attachListenerHandlers(api);
                api.listener.start({ retryOnClose: true });
                console.error("[mcp] Zalo listener started. MCP server ready.");
            } catch (e) {
                console.error("[mcp] Failed to start listener:", e.message);
                process.exit(1);
            }

            // Graceful shutdown on SIGINT
            process.once("SIGINT", () => {
                shuttingDown = true;
                try {
                    getApi().listener.stop();
                } catch {}
                notifier?.destroy();
                httpServer?.close();
                process.exit(0);
            });

            // Keep process alive (MCP server runs on stdio — process must not exit)
            await new Promise(() => {});
        });
}
