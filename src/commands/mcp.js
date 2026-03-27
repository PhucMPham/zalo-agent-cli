/**
 * MCP server command — starts a Model Context Protocol server over stdio transport.
 * Allows Claude Code and other MCP clients to read/send Zalo messages via tool calls.
 *
 * IMPORTANT: All diagnostic output uses console.error() — stdout is the MCP transport channel.
 */

import { getApi, autoLogin, clearSession } from "../core/zalo-client.js";
import { MessageBuffer } from "../mcp/message-buffer.js";
import { ThreadFilter } from "../mcp/thread-filter.js";

/** Extract readable text from non-string Zalo message content (replies, bubbles, etc.) */
function extractMsgText(content, msgType) {
    if (!content || typeof content !== "object") return `[${msgType || "attachment"}]`;
    if (content.params?.message) return content.params.message;
    if (content.description) return content.description;
    if (content.title) return content.title;
    if (content.text) return content.text;
    if (content.msg) return content.msg;
    if (content.href) return content.href;
    if (content.content && typeof content.content === "string") return content.content;
    try {
        const str = JSON.stringify(content);
        if (str.length < 200) return `[${msgType || "object"}: ${str}]`;
    } catch {}
    return `[${msgType || "attachment"}]`;
}
import { loadMCPConfig, parseDuration } from "../mcp/mcp-config.js";
import { createMCPServer } from "../mcp/mcp-server.js";
import { registerTools } from "../mcp/mcp-tools.js";
import { createHTTPServer } from "../mcp/mcp-http-transport.js";
import { ZaloNotifier } from "../mcp/notifier.js";
import { ThreadNameCache } from "../mcp/thread-name-cache.js";
import { autoDownloadMedia, isDownloadableMedia } from "../mcp/media-downloader.js";

/** Zalo close code for duplicate web session — fatal, do not retry */
const CLOSE_DUPLICATE = 3000;

/**
 * Normalize a raw zca-js message event into the buffer's message shape.
 * @param {object} msg - Raw zca-js message event
 * @returns {object} Normalized message
 */
function normalizeMessage(msg) {
    const rawContent = msg.data.content;
    const isText = typeof rawContent === "string";
    return {
        id: msg.data.msgId,
        threadId: msg.threadId,
        threadType: msg.type === 0 ? "dm" : "group",
        senderId: msg.data.uidFrom || null,
        senderName: msg.data.dName || null,
        text: isText ? rawContent : extractMsgText(rawContent, msg.data.msgType),
        timestamp: Date.now(),
        type: isText ? "text" : msg.data.msgType || "attachment",
        attachment:
            !isText && rawContent
                ? {
                      type: msg.data.msgType,
                      url: rawContent.href || null,
                      description: rawContent.title || null,
                  }
                : null,
        replyTo: null,
    };
}

export function registerMCPCommands(program) {
    const mcp = program.command("mcp").description("MCP server for AI agent integration");

    mcp.command("start")
        .description("Start MCP server (stdio or HTTP transport)")
        .option("--config <path>", "Config file path (default: ~/.zalo-agent-cli/mcp-config.json)")
        .option("--http <port>", "Use HTTP transport on specified port (default: stdio)")
        .option("--auth <token>", "Bearer token for HTTP auth (only with --http)")
        .option("--host <address>", "HTTP bind address (default: 127.0.0.1, only with --http)")
        .action(async (opts) => {
            // Perform login explicitly here — preAction hook skips "mcp"
            try {
                await autoLogin(false);
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
                    const deps = { api: getApi(), buffer, filter, config, nameCache };
                    const authToken = opts.auth?.trim() || null;
                    httpServer = createHTTPServer(registerTools, deps, port, authToken, opts.host || "127.0.0.1");
                    console.error(`[mcp] HTTP server started on port ${port}`);
                } else {
                    await createMCPServer(getApi(), buffer, filter, config, nameCache);
                }
            } catch (e) {
                console.error("[mcp] Failed to start MCP server:", e.message);
                process.exit(1);
            }

            // Setup notifier (sends to Zalo group when agent is offline)
            const notifier = new ZaloNotifier(getApi(), config);

            let reconnectCount = 0;

            /**
             * Attach Zalo listener handlers to the current API instance.
             * Must be called again after each re-login with the new API instance.
             * @param {object} api - zca-js API instance
             */
            function attachListenerHandlers(api) {
                api.listener.on("message", (msg) => {
                    // Skip self-sent messages
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
                });

                api.listener.on("disconnected", (code) => {
                    console.error(`[mcp] Disconnected (code: ${code}). Auto-retrying...`);
                });

                api.listener.on("closed", async (code) => {
                    if (code === CLOSE_DUPLICATE) {
                        console.error("[mcp] Duplicate Zalo Web session detected. Exiting.");
                        process.exit(1);
                    }
                    reconnectCount++;
                    console.error(
                        `[mcp] Connection closed (code: ${code}). Re-login in 5s... (reconnect #${reconnectCount})`,
                    );
                    await new Promise((r) => setTimeout(r, 5000));
                    try {
                        clearSession();
                        await autoLogin(false);
                        console.error("[mcp] Re-login successful. Restarting listener...");
                        const newApi = getApi();
                        attachListenerHandlers(newApi);
                        newApi.listener.start({ retryOnClose: true });
                    } catch (e) {
                        console.error(`[mcp] Re-login failed: ${e.message}. Retrying in 30s...`);
                        await new Promise((r) => setTimeout(r, 30000));
                        try {
                            clearSession();
                            await autoLogin(false);
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
            process.on("SIGINT", () => {
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
