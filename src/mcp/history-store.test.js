import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HistoryStore } from "./history-store.js";

/** Helper: create a history message */
function m(msgId, timestamp, text = "hi") {
    return { msgId, timestamp, text, threadId: "T1" };
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
