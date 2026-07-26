import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    threadTypeLabel,
    extractReplyTo,
    extractMentions,
    normalizeMessage,
    toHistoryMessage,
} from "./message-normalize.js";

/** Build a fake zca-js message event. */
function fakeMsg(dataOverrides = {}, { type = 1, threadId = "g1" } = {}) {
    return {
        type,
        threadId,
        data: {
            msgId: "m1",
            uidFrom: "u1",
            dName: "Minh",
            content: "hello",
            msgType: "webchat",
            ts: "1710000000000",
            ...dataOverrides,
        },
    };
}

describe("threadTypeLabel", () => {
    it("maps 0→dm and 1→group", () => {
        assert.equal(threadTypeLabel(0), "dm");
        assert.equal(threadTypeLabel(1), "group");
    });
});

describe("extractReplyTo", () => {
    it("maps zca-js quote fields (ownerId→senderId, fromD→senderName, msg→text, globalMsgId→msgId)", () => {
        const msg = fakeMsg({
            quote: { ownerId: "u9", fromD: "Le Doan", msg: "M6 trắng sáng thấp", globalMsgId: 8084124152483 },
        });
        assert.deepEqual(extractReplyTo(msg), {
            senderId: "u9",
            senderName: "Le Doan",
            text: "M6 trắng sáng thấp",
            msgId: "8084124152483",
        });
    });

    it("returns null when there is no quote", () => {
        assert.equal(extractReplyTo(fakeMsg()), null);
    });

    it("preserves a globalMsgId of 0", () => {
        const msg = fakeMsg({ quote: { ownerId: "u9", fromD: "X", msg: "hi", globalMsgId: 0 } });
        assert.equal(extractReplyTo(msg).msgId, "0");
    });

    it("nulls missing quote sub-fields", () => {
        const msg = fakeMsg({ quote: { ownerId: "u9" } });
        assert.deepEqual(extractReplyTo(msg), { senderId: "u9", senderName: null, text: null, msgId: null });
    });
});

describe("extractMentions", () => {
    it("maps mentions[].uid to a uid array", () => {
        const msg = fakeMsg({
            mentions: [
                { uid: "u1", pos: 0, len: 3 },
                { uid: "u2", pos: 5, len: 4 },
            ],
        });
        assert.deepEqual(extractMentions(msg), ["u1", "u2"]);
    });

    it("returns null when there are no mentions", () => {
        assert.equal(extractMentions(fakeMsg()), null);
        assert.equal(extractMentions(fakeMsg({ mentions: [] })), null);
    });
});

describe("normalizeMessage (live buffer shape)", () => {
    it("normalizes a text message with an explicit receive timestamp", () => {
        const out = normalizeMessage(fakeMsg({ content: "hi there" }), 1234);
        assert.equal(out.id, "m1");
        assert.equal(out.threadId, "g1");
        assert.equal(out.threadType, "group");
        assert.equal(out.senderId, "u1");
        assert.equal(out.senderName, "Minh");
        assert.equal(out.text, "hi there");
        assert.equal(out.type, "text");
        assert.equal(out.timestamp, 1234);
        assert.equal(out.attachment, null);
        assert.equal(out.replyTo, null);
    });

    it("populates replyTo for a reply", () => {
        const out = normalizeMessage(
            fakeMsg({ quote: { ownerId: "u9", fromD: "Le Doan", msg: "q", globalMsgId: 7 } }),
            1,
        );
        assert.deepEqual(out.replyTo, { senderId: "u9", senderName: "Le Doan", text: "q", msgId: "7" });
    });
});

describe("toHistoryMessage (history shape)", () => {
    it("uses the real Zalo ts and carries replyTo + mentions", () => {
        const out = toHistoryMessage(
            fakeMsg({
                quote: { ownerId: "u9", fromD: "Le Doan", msg: "q", globalMsgId: 7 },
                mentions: [{ uid: "u2", pos: 0, len: 3 }],
            }),
        );
        assert.equal(out.msgId, "m1");
        assert.equal(out.timestamp, 1710000000000);
        assert.deepEqual(out.replyTo, { senderId: "u9", senderName: "Le Doan", text: "q", msgId: "7" });
        assert.deepEqual(out.mentions, ["u2"]);
    });

    it("falls back to the provided timestamp when ts is absent", () => {
        const msg = fakeMsg();
        delete msg.data.ts;
        assert.equal(toHistoryMessage(msg, 999).timestamp, 999);
    });
});
