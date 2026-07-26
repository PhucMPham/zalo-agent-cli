/**
 * Per-thread historical message store for the MCP server.
 *
 * Unlike MessageBuffer (a short-lived ring buffer for incremental agent reads),
 * this store accumulates message *history*: it is seeded at WebSocket (re)connect
 * from Zalo's old-message backfill (cmd 510/511) and grows as live messages arrive.
 *
 * Messages are kept sorted oldest→newest, deduped by msgId, and capped per thread.
 * Timestamps are the real Zalo `ts` (not receive time), so pagination is chronological.
 */

export class HistoryStore {
    /**
     * @param {number} maxPerThread - Max messages retained per thread (oldest evicted first)
     */
    constructor(maxPerThread = 2000) {
        /** @type {Map<string, Array>} threadId → messages sorted ascending by timestamp */
        this._threads = new Map();
        this._maxPerThread = maxPerThread;
    }

    /**
     * Merge messages into a thread's history. Deduped by msgId, re-sorted by timestamp,
     * trimmed to maxPerThread (keeping the newest).
     * @param {string} threadId
     * @param {Array<{msgId: string|number, timestamp?: number}>} messages - Normalized history messages
     * @returns {number} Count of newly added (non-duplicate) messages
     */
    ingest(threadId, messages) {
        if (!threadId || !Array.isArray(messages) || messages.length === 0) return 0;

        let list = this._threads.get(threadId);
        if (!list) {
            list = [];
            this._threads.set(threadId, list);
        }

        const seen = new Set(list.map((m) => String(m.msgId)));
        let added = 0;
        for (const m of messages) {
            if (!m || m.msgId === null || m.msgId === undefined) continue;
            const id = String(m.msgId);
            if (seen.has(id)) continue;
            seen.add(id);
            list.push(m);
            added++;
        }

        if (added > 0) {
            list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            if (list.length > this._maxPerThread) {
                this._threads.set(threadId, list.slice(list.length - this._maxPerThread));
            }
        }
        return added;
    }

    /**
     * Read a page of history for a thread, newest messages first-filled but returned
     * oldest→newest. Paginates *backward* in time via the `before` cursor.
     * @param {string} threadId
     * @param {object} [opts]
     * @param {number} [opts.limit=50] - Max messages to return
     * @param {string|null} [opts.before=null] - Return messages strictly older than this msgId
     * @returns {{ messages: Array, cursor: string|null, hasMore: boolean }}
     *          cursor = oldest msgId in this page (feed back as `before` to page further back)
     */
    read(threadId, { limit = 50, before = null } = {}) {
        return this.query({ threadId, limit, before });
    }

    /**
     * Query history with optional filters, returned oldest→newest and paginated *backward*
     * via the `before` cursor. Omit `threadId` to search across all threads.
     * @param {object} [opts]
     * @param {string|null} [opts.threadId=null] - Restrict to one thread; null = all threads
     * @param {string|null} [opts.senderId=null] - Only messages from this sender uid
     * @param {number|null} [opts.since=null] - Only messages with timestamp >= this (epoch ms)
     * @param {number|null} [opts.until=null] - Only messages with timestamp <= this (epoch ms)
     * @param {number} [opts.limit=50] - Max messages to return
     * @param {string|null} [opts.before=null] - Return messages strictly older than this msgId
     * @returns {{ messages: Array, cursor: string|null, hasMore: boolean }}
     *          cursor = oldest msgId in this page (feed back as `before` to page further back)
     */
    query({ threadId = null, senderId = null, since = null, until = null, limit = 50, before = null } = {}) {
        const lists =
            threadId !== null && threadId !== undefined
                ? [this._threads.get(threadId) || []]
                : Array.from(this._threads.values());

        const all = [];
        for (const list of lists) {
            for (const m of list) {
                if (senderId !== null && senderId !== undefined && String(m.senderId) !== String(senderId)) continue;
                if (since !== null && since !== undefined && m.timestamp < since) continue;
                if (until !== null && until !== undefined && m.timestamp > until) continue;
                all.push(m);
            }
        }

        // Deterministic chronological order across threads. Equal-timestamp ties break by
        // lexicographic msgId — intentional (keep it stable; don't switch to numeric compare,
        // which would break non-numeric ids). Ordering of same-millisecond messages is cosmetic.
        all.sort((a, b) => a.timestamp - b.timestamp || String(a.msgId).localeCompare(String(b.msgId)));

        let scoped = all;
        if (before !== null && before !== undefined) {
            // Assumes msgId is globally unique (Zalo assigns global snowflake ids, also surfaced
            // as quote.globalMsgId), so this anchors correctly even in a merged cross-thread list.
            const idx = all.findIndex((m) => String(m.msgId) === String(before));
            // Cursor found → messages strictly older than it. Cursor absent → it (and everything
            // older) was evicted by the per-thread cap, so there's nothing older to return.
            scoped = idx >= 0 ? all.slice(0, idx) : [];
        }

        const page = scoped.slice(Math.max(0, scoped.length - limit));
        const cursor = page.length > 0 ? String(page[0].msgId) : null;
        const hasMore = scoped.length > page.length;

        // Return shallow copies so callers (e.g. threadName enrichment) can't mutate the store.
        return { messages: page.map((m) => ({ ...m })), cursor, hasMore };
    }

    /** Number of messages stored for a thread. */
    count(threadId) {
        return (this._threads.get(threadId) || []).length;
    }

    /** Total messages across all threads. */
    size() {
        let total = 0;
        for (const list of this._threads.values()) total += list.length;
        return total;
    }

    /** Thread IDs that currently have history. */
    threadIds() {
        return Array.from(this._threads.keys());
    }
}

/**
 * Parse a since/until boundary into epoch milliseconds.
 * Accepts a number (ms), an all-digit string (ms), a date-only "YYYY-MM-DD" (local start of
 * day, or end of day when isEnd), or any Date-parseable string (e.g. ISO datetime).
 * Numeric input is taken as-is (epoch ms) — it is NOT range-validated, so a Unix-seconds value
 * resolves to ~1970 (yielding empty results), and negative/fractional ms pass through unchanged.
 * @param {string|number|null|undefined} value
 * @param {boolean} [isEnd=false] - For a date-only value, resolve to end-of-day (inclusive)
 * @returns {number|null} Milliseconds, or null if empty/unparseable
 */
export function parseTimeBoundary(value, isEnd = false) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const str = String(value).trim();
    if (/^\d+$/.test(str)) return Number(str); // epoch milliseconds
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(str);
    const ms = new Date(dateOnly ? `${str}T00:00:00` : str).getTime();
    if (Number.isNaN(ms)) return null;
    return dateOnly && isEnd ? ms + 86400000 - 1 : ms; // inclusive end of the day
}
