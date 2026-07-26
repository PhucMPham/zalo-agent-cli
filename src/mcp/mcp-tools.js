/**
 * MCP tool registrations for Zalo message access and sending.
 * Registers 8 tools: zalo_get_messages, zalo_get_history, zalo_search_history, zalo_send_message,
 * zalo_list_threads, zalo_search_threads, zalo_mark_read, zalo_view_media.
 */

import { z } from "zod";
import { downloadMedia, openFile } from "./media-downloader.js";
import { parseTimeBoundary } from "./history-store.js";

/** Thread type constants matching zca-js ThreadType enum */
const THREAD_USER = 0;

/**
 * Wrap a result object into MCP tool content format.
 * @param {object} result
 * @returns {{ content: Array }}
 */
function ok(result) {
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
}

/**
 * Wrap an error message into MCP tool error content format.
 * @param {string} message
 * @returns {{ content: Array, isError: true }}
 */
function err(message) {
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

/**
 * Annotate each message with its thread's display name (per-message, so it works for
 * both single-thread and cross-thread result sets).
 * @param {Array} messages
 * @param {import("./thread-name-cache.js").ThreadNameCache} [nameCache]
 * @returns {Array} the same messages, enriched
 */
function enrichThreadNames(messages, nameCache) {
    if (!nameCache) return messages;
    for (const msg of messages) {
        const info = nameCache.get(msg.threadId);
        if (info) msg.threadName = info.name;
    }
    return messages;
}

/**
 * Register all Zalo MCP tools on the server.
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {object} api - zca-js API instance
 * @param {import("./message-buffer.js").MessageBuffer} buffer
 * @param {import("./thread-filter.js").ThreadFilter} filter
 * @param {object} config - MCP config
 * @param {import("./thread-name-cache.js").ThreadNameCache} [nameCache] - Thread name cache
 * @param {import("./history-store.js").HistoryStore} [historyStore] - Message history store
 */
export function registerTools(server, api, buffer, filter, config, nameCache, historyStore) {
    const maxPerPoll = config.limits?.maxMessagesPerPoll ?? 20;

    // --- zalo_get_messages ---
    server.registerTool(
        "zalo_get_messages",
        {
            title: "Get Zalo Messages",
            description:
                "Get messages from Zalo threads (DMs and groups). Returns buffered messages since last read. Use 'since' cursor from previous response for incremental polling.",
            inputSchema: z.object({
                threadId: z.string().optional().describe("Thread ID to read from. Omit for all watched threads."),
                since: z.number().int().min(0).default(0).describe("Cursor from previous read for incremental polling"),
                limit: z.number().int().min(1).max(100).default(maxPerPoll).describe("Max messages to return"),
            }),
        },
        async ({ threadId, since, limit }) => {
            try {
                const result = buffer.read(threadId, since, limit);
                // Enrich messages with thread name from cache
                if (nameCache) {
                    for (const msg of result.messages) {
                        const info = nameCache.get(msg.threadId);
                        if (info) msg.threadName = info.name;
                    }
                }
                return ok(result);
            } catch (e) {
                console.error("[mcp-tools] zalo_get_messages error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_send_message ---
    server.registerTool(
        "zalo_send_message",
        {
            title: "Send Zalo Message",
            description: "Send a text message to a Zalo thread (DM or group). threadType: 0=DM(User), 1=Group.",
            inputSchema: z.object({
                threadId: z.string().describe("Thread ID to send message to"),
                text: z.string().min(1).describe("Message text to send"),
                threadType: z
                    .number()
                    .int()
                    .min(0)
                    .max(1)
                    .default(THREAD_USER)
                    .describe("Thread type: 0=DM(User), 1=Group"),
            }),
        },
        async ({ threadId, text, threadType }) => {
            try {
                const result = await api.sendMessage(text, threadId, Number(threadType));
                const messageId = result?.message?.msgId ?? result?.msgId ?? null;
                return ok({ success: true, messageId });
            } catch (e) {
                console.error("[mcp-tools] zalo_send_message error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_list_threads ---
    server.registerTool(
        "zalo_list_threads",
        {
            title: "List Zalo Threads",
            description:
                "List all Zalo threads currently buffered with unread message counts. Useful for discovering active conversations.",
            inputSchema: z.object({
                type: z
                    .enum(["group", "dm", "all"])
                    .default("all")
                    .describe("Filter by thread type: 'dm', 'group', or 'all'"),
            }),
        },
        async ({ type }) => {
            try {
                const stats = buffer.getStats(0);
                // Enrich each stat entry with threadType and thread name
                const enriched = stats.map((t) => {
                    const threadType = buffer.getThreadType(t.threadId) ?? "unknown";
                    const cached = nameCache?.get(t.threadId);
                    return {
                        ...t,
                        threadType,
                        name: cached?.name ?? null,
                        ...(cached?.memberCount !== undefined && { memberCount: cached.memberCount }),
                    };
                });
                const filtered = type === "all" ? enriched : enriched.filter((t) => t.threadType === type);
                return ok({ threads: filtered, total: filtered.length });
            } catch (e) {
                console.error("[mcp-tools] zalo_list_threads error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_search_threads ---
    server.registerTool(
        "zalo_search_threads",
        {
            title: "Search Zalo Threads",
            description:
                "Search threads (groups/DMs) by name. Uses fuzzy Vietnamese-aware matching. Useful for finding a thread ID by name.",
            inputSchema: z.object({
                query: z.string().min(1).describe("Search keyword (fuzzy match, case-insensitive, accent-insensitive)"),
                type: z
                    .enum(["group", "dm", "all"])
                    .default("all")
                    .describe("Filter by thread type: 'dm', 'group', or 'all'"),
                limit: z.number().int().min(1).max(50).default(10).describe("Max results to return"),
            }),
        },
        async ({ query, type, limit }) => {
            try {
                if (!nameCache?.ready) {
                    return err("Thread name cache not initialized yet. Try again shortly.");
                }
                const results = nameCache.search(query, type, limit);
                return ok({ results, total: results.length });
            } catch (e) {
                console.error("[mcp-tools] zalo_search_threads error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_mark_read ---
    server.registerTool(
        "zalo_mark_read",
        {
            title: "Mark Zalo Messages Read",
            description:
                "Discard buffered messages up to and including the given cursor. Use the cursor returned by zalo_get_messages.",
            inputSchema: z.object({
                cursor: z
                    .number()
                    .int()
                    .min(0)
                    .describe("Cursor value returned from a previous zalo_get_messages call"),
            }),
        },
        async ({ cursor }) => {
            try {
                const discarded = buffer.markRead(cursor);
                return ok({ success: true, discarded });
            } catch (e) {
                console.error("[mcp-tools] zalo_mark_read error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_get_history ---
    server.registerTool(
        "zalo_get_history",
        {
            title: "Get Zalo Message History",
            description:
                "Fetch message history for a Zalo DM or group conversation. Served from history this MCP " +
                "server has captured: seeded from the Zalo server's backfill each time the server (re)connects " +
                "(recent window, ~2 weeks) and growing as new messages arrive. Returns messages oldest→newest, " +
                "each with 'replyTo' (who/what it replies to) and 'mentions' when present. " +
                "Optional filters: 'senderId' (one person), 'since'/'until' (date range). " +
                "To page further back in time, pass the previous response's 'cursor' value as 'lastMsgId'. " +
                "Note: deep/old archives beyond Zalo's replay window are not retrievable via any API.",
            inputSchema: z.object({
                threadId: z.string().describe("Thread ID to fetch history from"),
                threadType: z
                    .number()
                    .int()
                    .min(0)
                    .max(1)
                    .default(THREAD_USER)
                    .describe("Thread type: 0=DM(User), 1=Group (used for the response label)"),
                senderId: z.string().optional().nullable().describe("Only messages sent by this user id"),
                since: z
                    .union([z.string(), z.number()])
                    .optional()
                    .nullable()
                    .describe("Only messages at/after this time — 'YYYY-MM-DD', ISO datetime, or epoch ms"),
                until: z
                    .union([z.string(), z.number()])
                    .optional()
                    .nullable()
                    .describe(
                        "Only messages at/before this time — 'YYYY-MM-DD' (inclusive), ISO datetime, or epoch ms",
                    ),
                limit: z.number().int().min(1).max(200).default(50).describe("Max messages to fetch"),
                lastMsgId: z
                    .string()
                    .optional()
                    .nullable()
                    .describe("Cursor: pass the previous response's 'cursor' to page further back in time"),
            }),
        },
        async ({ threadId, threadType, senderId, since, until, limit, lastMsgId }) => {
            try {
                if (!historyStore) {
                    return err("History store unavailable — restart the MCP server.");
                }

                const { messages, cursor, hasMore } = historyStore.query({
                    threadId,
                    senderId: senderId || null,
                    since: parseTimeBoundary(since),
                    until: parseTimeBoundary(until, true),
                    limit,
                    before: lastMsgId || null,
                });

                enrichThreadNames(messages, nameCache);

                return ok({
                    threadId,
                    threadType: threadType === 0 ? "dm" : "group",
                    count: messages.length,
                    messages,
                    cursor,
                    hasMore,
                });
            } catch (e) {
                console.error("[mcp-tools] zalo_get_history error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_search_history ---
    server.registerTool(
        "zalo_search_history",
        {
            title: "Search Zalo Message History",
            description:
                "Search captured message history ACROSS all threads (or one), filtered by sender and/or date " +
                "range. Use this for 'all messages from person X' (their DM + their messages in every group) or " +
                "'everything between two dates'. Returns messages oldest→newest with 'replyTo' and 'mentions'. " +
                "Provide at least one of senderId / since / until (or a threadId) to narrow the search. " +
                "Same coverage limit as zalo_get_history (~2-week replay window + live since server start).",
            inputSchema: z.object({
                senderId: z.string().optional().nullable().describe("Only messages sent by this user id"),
                threadId: z
                    .string()
                    .optional()
                    .nullable()
                    .describe("Restrict to one thread; omit to search across all threads"),
                since: z
                    .union([z.string(), z.number()])
                    .optional()
                    .nullable()
                    .describe("Only messages at/after this time — 'YYYY-MM-DD', ISO datetime, or epoch ms"),
                until: z
                    .union([z.string(), z.number()])
                    .optional()
                    .nullable()
                    .describe(
                        "Only messages at/before this time — 'YYYY-MM-DD' (inclusive), ISO datetime, or epoch ms",
                    ),
                limit: z.number().int().min(1).max(200).default(50).describe("Max messages to return"),
                before: z
                    .string()
                    .optional()
                    .nullable()
                    .describe("Cursor: pass the previous response's 'cursor' to page further back in time"),
            }),
        },
        async ({ senderId, threadId, since, until, limit, before }) => {
            try {
                if (!historyStore) {
                    return err("History store unavailable — restart the MCP server.");
                }
                // Parse boundaries first so presence is judged on the parsed value (a valid
                // epoch-0 boundary must not be rejected as "no filter").
                const sinceMs = parseTimeBoundary(since);
                const untilMs = parseTimeBoundary(until, true);
                if (!senderId && !threadId && sinceMs === null && untilMs === null) {
                    return err("Provide at least one filter: senderId, threadId, since, or until.");
                }

                const { messages, cursor, hasMore } = historyStore.query({
                    threadId: threadId || null,
                    senderId: senderId || null,
                    since: sinceMs,
                    until: untilMs,
                    limit,
                    before: before || null,
                });

                enrichThreadNames(messages, nameCache);

                return ok({ count: messages.length, messages, cursor, hasMore });
            } catch (e) {
                console.error("[mcp-tools] zalo_search_history error:", e.message);
                return err(e.message);
            }
        },
    );

    // --- zalo_view_media ---
    const mediaConfig = config.media || {};
    server.registerTool(
        "zalo_view_media",
        {
            title: "View Zalo Media",
            description:
                "Open a Zalo media file (image, audio, video) with the system viewer. " +
                "Media is auto-downloaded when received, organized by thread folder with date/sender metadata filenames. " +
                "If not yet downloaded, downloads first then opens.",
            inputSchema: z.object({
                messageId: z.string().describe("Message ID from zalo_get_messages that has a media attachment"),
                threadId: z.string().optional().describe("Thread ID to search in. Omit to search all threads."),
                open: z
                    .boolean()
                    .default(mediaConfig.autoOpen ?? true)
                    .describe("Open media with system viewer"),
            }),
        },
        async ({ messageId, threadId, open }) => {
            try {
                const allMessages = buffer.read(threadId, 0, 9999).messages;
                const message = allMessages.find((m) => m.id === messageId);
                if (!message) return err(`Message ${messageId} not found in buffer`);
                if (!message.attachment?.url) return err(`Message ${messageId} has no media attachment`);

                // Use local file if already auto-downloaded, otherwise download now
                let localPath = message.attachment.localPath;
                if (!localPath) {
                    const threadName = nameCache?.get(message.threadId)?.name || null;
                    const result = await downloadMedia(message, {
                        downloadDir: mediaConfig.downloadDir || undefined,
                        autoOpen: false,
                        threadName,
                    });
                    localPath = result.path;
                }

                if (open) openFile(localPath);

                return ok({ success: true, path: localPath, mediaType: message.type });
            } catch (e) {
                console.error("[mcp-tools] zalo_view_media error:", e.message);
                return err(e.message);
            }
        },
    );
}
