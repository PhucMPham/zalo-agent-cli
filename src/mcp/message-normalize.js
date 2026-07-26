/**
 * Pure helpers that normalize raw zca-js message events into the shapes used by the
 * MCP live buffer and history store. Kept dependency-light (only extractMessageText)
 * so the zca-js field mapping can be unit-tested in isolation.
 */

import { extractMessageText } from "../utils/extract-message-text.js";

/** Map a zca-js thread type (0/1) to the string label used across the buffer/history. */
export function threadTypeLabel(type) {
    return type === 0 ? "dm" : "group";
}

/**
 * Resolve a zca-js message's content into a plain-text string and a type label.
 * Text messages carry a string content; everything else is an object we flatten
 * via extractMessageText (reply/bubble/link/etc.).
 * @param {*} rawContent - msg.data.content
 * @param {string} [msgType] - msg.data.msgType
 * @returns {{ isText: boolean, text: string, type: string }}
 */
export function resolveContent(rawContent, msgType) {
    const isText = typeof rawContent === "string";
    return {
        isText,
        text: isText ? rawContent : extractMessageText(rawContent, msgType),
        type: isText ? "text" : msgType || "attachment",
    };
}

/**
 * Extract reply/quote info from a zca-js message (who/what this message replies to).
 * Note: for replies to media (image/sticker/file), `text` may be a serialized non-text
 * payload rather than plain text, mirroring how Zalo stores the quoted content.
 * @param {object} msg - Raw zca-js message event
 * @returns {{ senderId: string|null, senderName: string|null, text: string|null, msgId: string|null } | null}
 */
export function extractReplyTo(msg) {
    const q = msg.data?.quote;
    if (!q) return null;
    return {
        senderId: q.ownerId ?? null,
        senderName: q.fromD ?? null,
        text: q.msg ?? null,
        msgId: q.globalMsgId !== null && q.globalMsgId !== undefined ? String(q.globalMsgId) : null,
    };
}

/**
 * Extract mentioned user IDs from a group message.
 * @param {object} msg - Raw zca-js message event
 * @returns {string[]|null} Mentioned uids, or null if none
 */
export function extractMentions(msg) {
    return Array.isArray(msg.data?.mentions) && msg.data.mentions.length > 0
        ? msg.data.mentions.map((m) => m.uid)
        : null;
}

/**
 * Normalize a raw zca-js message event into the live buffer's message shape.
 * @param {object} msg - Raw zca-js message event
 * @param {number} [timestamp] - Receive time in ms (defaults to Date.now())
 * @returns {object} Normalized message
 */
export function normalizeMessage(msg, timestamp = Date.now()) {
    const rawContent = msg.data.content;
    const { isText, text, type } = resolveContent(rawContent, msg.data.msgType);
    return {
        id: msg.data.msgId,
        threadId: msg.threadId,
        threadType: threadTypeLabel(msg.type),
        senderId: msg.data.uidFrom || null,
        senderName: msg.data.dName || null,
        text,
        timestamp,
        type,
        attachment:
            !isText && rawContent
                ? {
                      type: msg.data.msgType,
                      url: rawContent.href || null,
                      description: rawContent.title || null,
                  }
                : null,
        replyTo: extractReplyTo(msg),
    };
}

/**
 * Normalize a raw zca-js message into the HistoryStore shape.
 * Unlike normalizeMessage(), this preserves the real Zalo timestamp (msg.data.ts)
 * so historical messages sort chronologically.
 * @param {object} msg - Raw zca-js message event (live or old_messages backfill)
 * @param {number} [fallbackTs] - Timestamp used when msg.data.ts is absent (defaults to Date.now())
 * @returns {object} History message
 */
export function toHistoryMessage(msg, fallbackTs = Date.now()) {
    const { text, type } = resolveContent(msg.data?.content, msg.data?.msgType);
    return {
        msgId: msg.data?.msgId,
        threadId: msg.threadId,
        threadType: threadTypeLabel(msg.type),
        senderId: msg.data?.uidFrom || null,
        senderName: msg.data?.dName || null,
        text,
        timestamp: msg.data?.ts !== null && msg.data?.ts !== undefined ? Number(msg.data.ts) : fallbackTs,
        type,
        replyTo: extractReplyTo(msg),
        mentions: extractMentions(msg),
    };
}
