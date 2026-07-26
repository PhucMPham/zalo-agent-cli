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
        const list = this._threads.get(threadId) || [];

        let scoped = list;
        if (before !== null && before !== undefined) {
            const idx = list.findIndex((m) => String(m.msgId) === String(before));
            if (idx >= 0) scoped = list.slice(0, idx); // strictly older than the cursor
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
