import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reconnectDelay, RECONNECT_BASE_MS, RECONNECT_MAX_MS } from "./reconnect.js";

describe("reconnectDelay", () => {
    it("uses the base delay for the first close (0 or 1)", () => {
        assert.equal(reconnectDelay(0), RECONNECT_BASE_MS);
        assert.equal(reconnectDelay(1), RECONNECT_BASE_MS);
    });

    it("doubles for each additional rapid close", () => {
        assert.equal(reconnectDelay(2), RECONNECT_BASE_MS * 2);
        assert.equal(reconnectDelay(3), RECONNECT_BASE_MS * 4);
        assert.equal(reconnectDelay(4), RECONNECT_BASE_MS * 8);
    });

    it("never exceeds the cap", () => {
        assert.equal(reconnectDelay(99), RECONNECT_MAX_MS);
        assert.ok(reconnectDelay(20) <= RECONNECT_MAX_MS);
    });

    it("is monotonically non-decreasing", () => {
        let prev = 0;
        for (let n = 0; n <= 15; n++) {
            const d = reconnectDelay(n);
            assert.ok(d >= prev, `delay(${n})=${d} should be >= previous ${prev}`);
            prev = d;
        }
    });

    it("honors custom base and max", () => {
        assert.equal(reconnectDelay(1, 1000, 8000), 1000);
        assert.equal(reconnectDelay(4, 1000, 8000), 8000); // 1000*8 capped to 8000
    });

    it("treats invalid input as zero (base delay)", () => {
        assert.equal(reconnectDelay(undefined), RECONNECT_BASE_MS);
        assert.equal(reconnectDelay(NaN), RECONNECT_BASE_MS);
        assert.equal(reconnectDelay(-5), RECONNECT_BASE_MS);
    });
});
