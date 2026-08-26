import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { checkForUpdates, isNewerVersion, shouldSkipUpdateCheck } from "./update-check.js";

describe("isNewerVersion", () => {
    it("detects patch, minor, and major bumps", () => {
        assert.equal(isNewerVersion("1.6.3", "1.6.2"), true);
        assert.equal(isNewerVersion("1.7.0", "1.6.2"), true);
        assert.equal(isNewerVersion("2.0.0", "1.9.9"), true);
    });

    it("does not nag when current is equal or ahead of the registry", () => {
        assert.equal(isNewerVersion("1.7.0", "1.7.0"), false);
        assert.equal(isNewerVersion("1.6.2", "1.7.0"), false);
    });
});

describe("shouldSkipUpdateCheck", () => {
    afterEach(() => {
        delete process.env.ZALO_JSON_MODE;
    });

    it("skips in --json mode", () => {
        assert.equal(shouldSkipUpdateCheck(true), true);
    });

    it("skips when ZALO_JSON_MODE is set (MCP stdio)", () => {
        process.env.ZALO_JSON_MODE = "1";
        assert.equal(shouldSkipUpdateCheck(false), true);
    });

    it("runs for interactive CLI", () => {
        delete process.env.ZALO_JSON_MODE;
        assert.equal(shouldSkipUpdateCheck(false), false);
    });
});

describe("checkForUpdates", () => {
    let originalFetch;
    let fetchCalls;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        fetchCalls = [];
        delete process.env.ZALO_JSON_MODE;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        delete process.env.ZALO_JSON_MODE;
    });

    it("does not hit the network in json mode", async () => {
        globalThis.fetch = async (...args) => {
            fetchCalls.push(args);
            return new Response("{}");
        };
        await checkForUpdates("1.0.0", true);
        assert.equal(fetchCalls.length, 0);
    });

    it("does not hit the network when ZALO_JSON_MODE is set", async () => {
        process.env.ZALO_JSON_MODE = "1";
        globalThis.fetch = async (...args) => {
            fetchCalls.push(args);
            return new Response("{}");
        };
        await checkForUpdates("1.0.0", false);
        assert.equal(fetchCalls.length, 0);
    });

    it("queries the npm registry HTTP API, not `npm view`", async () => {
        globalThis.fetch = async (url) => {
            fetchCalls.push(String(url));
            return new Response(JSON.stringify({ version: "1.6.3" }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        };
        await checkForUpdates("1.6.2", false);
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0], "https://registry.npmjs.org/zalo-agent-cli/latest");
    });

    it("warns only when the registry version is newer", async () => {
        globalThis.fetch = async () =>
            new Response(JSON.stringify({ version: "1.6.3" }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        const lines = [];
        const origErr = console.error;
        console.error = (...args) => lines.push(args.map(String).join(" "));
        try {
            await checkForUpdates("1.6.2", false);
        } finally {
            console.error = origErr;
        }
        assert.match(lines.join("\n"), /1\.6\.2 → 1\.6\.3/);
    });

    it("does not warn when the local version is ahead of the registry", async () => {
        globalThis.fetch = async () =>
            new Response(JSON.stringify({ version: "1.6.2" }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        const lines = [];
        const origErr = console.error;
        console.error = (...args) => lines.push(args.map(String).join(" "));
        try {
            await checkForUpdates("1.7.0", false);
        } finally {
            console.error = origErr;
        }
        assert.equal(lines.length, 0);
    });

    it("swallows a failed registry lookup", async () => {
        globalThis.fetch = async () => {
            throw new Error("network down");
        };
        await assert.doesNotReject(() => checkForUpdates("1.0.0", false));
    });
});
