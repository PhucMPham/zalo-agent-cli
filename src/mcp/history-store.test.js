import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HistoryStore, parseTimeBoundary } from "./history-store.js";

/** Helper: create a history message */
function m(msgId, timestamp, text = "hi") {
    return { msgId, timestamp, text, threadId: "T1" };
}

/** Helper: create a history message with sender + thread */
function msg(msgId, timestamp, { senderId = "u1", threadId = "T1" } = {}) {
    return { msgId, timestamp, text: "hi", senderId, threadId };
}

describe("HistoryStore ingest", () => {
    it("stores messages and reports count", () => {
        const store = new HistoryStore();
        const added = store.ingest("T1", [m("1", 100), m("2", 200)]);
        assert.equal(added, 2);
        assert.equal(store.count("T1"), 2);
        assert.equal(store.size(), 2);
    });

    it("dedupes by msgId across ingests", () => {
        const store = new HistoryStore();
        store.ingest("T1", [m("1", 100), m("2", 200)]);
        const added = store.ingest("T1", [m("2", 200), m("3", 300)]);
        assert.equal(added, 1); // only msgId 3 is new
        assert.equal(store.count("T1"), 3);
    });

    it("dedupes duplicates within a single batch", () => {
        const store = new HistoryStore();
        const added = store.ingest("T1", [m("1", 100), m("1", 100)]);
        assert.equal(added, 1);
    });

    it("keeps messages sorted ascending by timestamp regardless of ingest order", () => {
        const store = new HistoryStore();
        store.ingest("T1", [m("3", 300), m("1", 100), m("2", 200)]);
        const { messages } = store.read("T1", { limit: 10 });
        assert.deepEqual(
            messages.map((x) => x.msgId),
            ["1", "2", "3"],
        );
    });

    it("treats numeric and string msgIds as equal for dedup", () => {
        const store = new HistoryStore();
        store.ingest("T1", [m(1, 100)]);
        const added = store.ingest("T1", [m("1", 100)]);
        assert.equal(added, 0);
    });

    it("ignores empty / invalid input", () => {
        const store = new HistoryStore();
        assert.equal(store.ingest("T1", []), 0);
        assert.equal(store.ingest("T1", null), 0);
        assert.equal(store.ingest("", [m("1", 100)]), 0);
        assert.equal(store.ingest("T1", [{ timestamp: 1 }]), 0); // no msgId
    });

    it("caps per thread, evicting oldest", () => {
        const store = new HistoryStore(3);
        store.ingest("T1", [m("1", 100), m("2", 200), m("3", 300), m("4", 400)]);
        assert.equal(store.count("T1"), 3);
        const { messages } = store.read("T1", { limit: 10 });
        assert.deepEqual(
            messages.map((x) => x.msgId),
            ["2", "3", "4"], // oldest (1) evicted
        );
    });
});

describe("HistoryStore read + pagination", () => {
    it("returns the newest `limit` messages, oldest-first", () => {
        const store = new HistoryStore();
        store.ingest("T1", [m("1", 100), m("2", 200), m("3", 300), m("4", 400)]);
        const { messages, cursor, hasMore } = store.read("T1", { limit: 2 });
        assert.deepEqual(
            messages.map((x) => x.msgId),
            ["3", "4"],
        );
        assert.equal(cursor, "3"); // oldest in page
        assert.equal(hasMore, true);
    });

    it("pages backward via the `before` cursor", () => {
        const store = new HistoryStore();
        store.ingest("T1", [m("1", 100), m("2", 200), m("3", 300), m("4", 400)]);
        const first = store.read("T1", { limit: 2 }); // [3,4], cursor 3
        const older = store.read("T1", { limit: 2, before: first.cursor });
        assert.deepEqual(
            older.messages.map((x) => x.msgId),
            ["1", "2"],
        );
        assert.equal(older.hasMore, false);
    });

    it("returns empty for unknown thread", () => {
        const store = new HistoryStore();
        const { messages, cursor, hasMore } = store.read("nope", { limit: 5 });
        assert.deepEqual(messages, []);
        assert.equal(cursor, null);
        assert.equal(hasMore, false);
    });

    it("returns empty for an unknown `before` cursor (evicted → nothing older)", () => {
        const store = new HistoryStore();
        store.ingest("T1", [m("1", 100), m("2", 200)]);
        const { messages, cursor, hasMore } = store.read("T1", { limit: 10, before: "9999" });
        assert.deepEqual(messages, []);
        assert.equal(cursor, null);
        assert.equal(hasMore, false);
    });
});

describe("HistoryStore query filters", () => {
    function seeded() {
        const store = new HistoryStore();
        store.ingest("T1", [
            msg("1", 100, { senderId: "alice", threadId: "T1" }),
            msg("2", 200, { senderId: "bob", threadId: "T1" }),
            msg("3", 300, { senderId: "alice", threadId: "T1" }),
        ]);
        store.ingest("T2", [
            msg("4", 150, { senderId: "alice", threadId: "T2" }),
            msg("5", 250, { senderId: "carol", threadId: "T2" }),
        ]);
        return store;
    }

    it("filters by senderId within a thread", () => {
        const { messages } = seeded().query({ threadId: "T1", senderId: "alice" });
        assert.deepEqual(
            messages.map((x) => x.msgId),
            ["1", "3"],
        );
    });

    it("filters by senderId across all threads when threadId omitted", () => {
        const { messages } = seeded().query({ senderId: "alice" });
        // Merged + sorted by timestamp: T1/1(100), T2/4(150), T1/3(300)
        assert.deepEqual(
            messages.map((x) => x.msgId),
            ["1", "4", "3"],
        );
    });

    it("filters by since/until (inclusive)", () => {
        const { messages } = seeded().query({ since: 150, until: 250 });
        assert.deepEqual(messages.map((x) => x.msgId).sort(), ["2", "4", "5"]);
    });

    it("combines senderId + date range + cross-thread", () => {
        const { messages } = seeded().query({ senderId: "alice", since: 120 });
        assert.deepEqual(
            messages.map((x) => x.msgId),
            ["4", "3"],
        );
    });

    it("paginates cross-thread results backward via the cursor", () => {
        const store = seeded();
        const first = store.query({ senderId: "alice", limit: 1 }); // newest alice msg = "3"
        assert.deepEqual(
            first.messages.map((x) => x.msgId),
            ["3"],
        );
        assert.equal(first.hasMore, true);
        const older = store.query({ senderId: "alice", limit: 10, before: first.cursor });
        assert.deepEqual(
            older.messages.map((x) => x.msgId),
            ["1", "4"],
        );
    });

    it("returns empty for an evicted cross-thread `before` cursor", () => {
        const { messages, cursor, hasMore } = seeded().query({ senderId: "alice", before: "9999" });
        assert.deepEqual(messages, []);
        assert.equal(cursor, null);
        assert.equal(hasMore, false);
    });

    it("breaks equal-timestamp ties by lexicographic msgId (deterministic)", () => {
        const store = new HistoryStore();
        store.ingest("T1", [msg("b", 100), msg("a", 100), msg("c", 100)]);
        const { messages } = store.query({ threadId: "T1" });
        assert.deepEqual(
            messages.map((x) => x.msgId),
            ["a", "b", "c"],
        );
    });
});

describe("parseTimeBoundary", () => {
    it("passes through numeric ms", () => {
        assert.equal(parseTimeBoundary(1785070103366), 1785070103366);
    });

    it("parses an all-digit string as ms", () => {
        assert.equal(parseTimeBoundary("1785070103366"), 1785070103366);
    });

    it("parses a date-only string to local start of day", () => {
        assert.equal(parseTimeBoundary("2026-07-26"), new Date("2026-07-26T00:00:00").getTime());
    });

    it("parses an ISO datetime with Z as UTC", () => {
        assert.equal(parseTimeBoundary("2026-07-26T10:00:00Z"), Date.parse("2026-07-26T10:00:00Z"));
    });

    it("resolves a date-only end boundary to end of day", () => {
        const start = new Date("2026-07-26T00:00:00").getTime();
        assert.equal(parseTimeBoundary("2026-07-26", true), start + 86400000 - 1);
    });

    it("returns null for empty/invalid input", () => {
        assert.equal(parseTimeBoundary(null), null);
        assert.equal(parseTimeBoundary(undefined), null);
        assert.equal(parseTimeBoundary(""), null);
        assert.equal(parseTimeBoundary("not-a-date"), null);
    });
});
