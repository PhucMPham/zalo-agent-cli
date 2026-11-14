import { test } from "node:test";
import assert from "node:assert/strict";
import { startControlServer } from "./control-server.js";
import { sendFilesWithTimeout } from "./send-with-timeout.js";

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

test("timeout drops this send's upload callbacks, including ones registered late", async () => {
    const uploadCallbacks = new Map([["other", () => {}]]);
    const api = {
        getContext: () => ({ uploadCallbacks }),
        sendMessage: async () => {
            uploadCallbacks.set("early", () => {});
            await tick(40); // upload response arrives after the 20ms timeout
            uploadCallbacks.set("late", () => {});
            return new Promise(() => {});
        },
    };
    await assert.rejects(sendFilesWithTimeout(api, { paths: ["/tmp/a.csv"] }, "1", 0, 20), {
        maybeSent: false,
    });
    await tick(40);
    assert.deepEqual([...uploadCallbacks.keys()], ["other"]);
});

test("timeout after every waiting upload is confirmed reports maybeSent", async () => {
    const uploadCallbacks = new Map();
    const api = {
        getContext: () => ({ uploadCallbacks }),
        sendMessage: async () => {
            uploadCallbacks.set("f1", () => {});
            uploadCallbacks.get("f1")(); // file_done arrived; hashing + final send still pending
            return new Promise(() => {});
        },
    };
    await assert.rejects(sendFilesWithTimeout(api, { paths: ["/tmp/a.csv"] }, "1", 0, 20), {
        maybeSent: true,
    });
    assert.ok(uploadCallbacks.has("f1")); // not cancelled

    // photo.JPG is an image to zca-js's uploader (lowercased) and registers no callback
    await assert.rejects(sendFilesWithTimeout(api, { paths: ["/tmp/a.csv", "/tmp/photo.JPG"] }, "1", 0, 20), {
        maybeSent: true,
    });
});

test("image and gif-only sends get no timer, since they never wait for file_done", async () => {
    for (const p of ["/tmp/a.png", "/tmp/photo.JPG", "/tmp/anim.gif"]) {
        const api = { sendMessage: () => tick(40).then(() => ({ attachment: [p] })) };
        assert.deepEqual(await sendFilesWithTimeout(api, { paths: [p] }, "1", 0, 20), { attachment: [p] });
    }
});

test("caption is sent after non-image files, inline for a single image", async () => {
    const calls = [];
    const api = {
        sendMessage: async (content) => {
            calls.push(content);
            return { message: "m", attachment: ["a"] };
        },
    };
    const result = await sendFilesWithTimeout(api, { caption: "hi", paths: ["/tmp/a.xlsx"] }, "1", 0, 1000);
    assert.deepEqual(calls, [{ msg: "", attachments: ["/tmp/a.xlsx"] }, "hi"]);
    assert.deepEqual(result, { message: "m", attachment: ["a"] });

    calls.length = 0;
    await sendFilesWithTimeout(api, { caption: "hi", paths: ["/tmp/a.png"] }, "1", 0, 1000);
    assert.deepEqual(calls, [{ msg: "hi", attachments: ["/tmp/a.png"] }]);

    // zca-js matches extensions case-sensitively via path.extname, so these are not images
    for (const p of ["/tmp/a.PNG", "/tmp/.png"]) {
        calls.length = 0;
        await sendFilesWithTimeout(api, { caption: "hi", paths: [p] }, "1", 0, 1000);
        assert.deepEqual(calls, [{ msg: "", attachments: [p] }, "hi"]);
    }

    calls.length = 0;
    api.sendMessage = async (content) => {
        if (content === "hi") throw new Error("caption down");
        return { attachment: ["a"] };
    };
    const partial = await sendFilesWithTimeout(api, { caption: "hi", paths: ["/tmp/a.csv"] }, "1", 0, 1000);
    assert.deepEqual(partial, { attachment: ["a"], captionError: "caption down" });

    calls.length = 0;
    api.sendMessage = () => new Promise(() => {});
    await assert.rejects(sendFilesWithTimeout(api, { caption: "hi", paths: ["/tmp/a.csv"] }, "1", 0, 20));
    assert.deepEqual(calls, []); // caption never sent when the file times out
});

async function withServer(getApi, timeoutMs, fn) {
    const server = await startControlServer(0, getApi, timeoutMs);
    const port = server.address().port;
    const post = (body, headers = {}) =>
        fetch(`http://127.0.0.1:${port}/send-file`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: typeof body === "string" ? body : JSON.stringify(body),
        }).then(async (r) => [r.status, await r.json()]);
    try {
        await fn(post, port);
    } finally {
        server.close();
    }
}

test("control server sends via the api current at request time", async () => {
    const calls = [];
    const makeApi = (name) => ({
        sendMessage: async (content, threadId, type) => {
            calls.push({ name, content, threadId, type });
            return { attachment: [name] };
        },
    });
    let current = makeApi("first");
    await withServer(
        () => current,
        1000,
        async (post) => {
            const [status, body] = await post({ threadId: "42", paths: ["/tmp/a.csv"], type: 1 });
            assert.equal(status, 200);
            assert.deepEqual(body, { ok: true, result: { attachment: ["first"] } });
            assert.deepEqual(calls[0], {
                name: "first",
                content: { msg: "", attachments: ["/tmp/a.csv"] },
                threadId: "42",
                type: 1,
            });

            current = makeApi("second"); // simulates re-login replacing the api
            await post({ threadId: "42", paths: ["/tmp/b"] });
            assert.equal(calls[1].name, "second");
        },
    );
});

test("control server rejects bad requests and maps send failures", async () => {
    const api = { sendMessage: async () => ({}) };
    await withServer(
        () => api,
        30,
        async (post, port) => {
            assert.equal((await post({ threadId: "42", paths: [] }))[0], 400);
            assert.equal((await post({ paths: ["/tmp/a"] }))[0], 400);
            assert.equal((await post("{not json"))[0], 400);
            assert.equal((await post({ threadId: "42", paths: ["/tmp/a"], caption: null }))[0], 400);
            assert.equal((await post({ threadId: "42", paths: ["/tmp/a"] }, { "Content-Type": "text/plain" }))[0], 415);
            assert.equal(
                (await post({ threadId: "42", paths: ["/tmp/a"] }, { Origin: "https://evil.example" }))[0],
                403,
            );
            assert.equal((await post({ threadId: "x".repeat(70_000), paths: ["/tmp/a"] }))[0], 413);
            const notFound = await fetch(`http://127.0.0.1:${port}/other`);
            assert.equal(notFound.status, 404);

            api.sendMessage = async () => {
                throw new Error("boom");
            };
            assert.deepEqual(await post({ threadId: "42", paths: ["/tmp/a"] }), [502, { ok: false, error: "boom" }]);

            api.sendMessage = () => new Promise(() => {});
            const [status, body] = await post({ threadId: "42", paths: ["/tmp/a"] });
            assert.equal(status, 504);
            assert.match(body.error, /timed out/);
            assert.equal(body.maybeSent, false);
            assert.doesNotMatch(body.error, /--control-port/);
        },
    );
});
