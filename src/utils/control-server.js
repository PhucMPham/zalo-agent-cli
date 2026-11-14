/**
 * Localhost control endpoint for `listen`. Sends go through the process that holds
 * the account's only WebSocket listener, so zca-js receives the `file_done` event
 * it waits for after uploading non-image files.
 *
 * POST /send-file  Content-Type: application/json
 *   {"threadId": "...", "paths": ["/abs/or/rel"], "type": 0, "caption": ""}
 *   200 {"ok": true, "result": {..., captionError?}}  files delivered; captionError if the caption failed
 *   4xx bad request | 502 send failed
 *   504 {"ok": false, "maybeSent": bool}  timed out; retry only when maybeSent is false
 *
 * A send started before the client disconnects still completes, so client timeouts
 * must exceed the 60s send timeout or retries can duplicate files.
 *
 * Browser requests are refused (Origin present, or Host not loopback) so a web page
 * cannot make this process upload local files.
 */

import { createServer } from "http";
import { resolve } from "path";
import { sendFilesWithTimeout, SendTimeoutError } from "./send-with-timeout.js";

const MAX_BODY_BYTES = 64 * 1024;

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function reply(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
}

function readJson(req) {
    return new Promise((ok, fail) => {
        let size = 0;
        const chunks = [];
        req.on("data", (c) => {
            size += c.length;
            if (size <= MAX_BODY_BYTES) chunks.push(c);
        });
        req.on("end", () => {
            if (size > MAX_BODY_BYTES) return fail(new HttpError(413, "Body too large"));
            try {
                ok(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
            } catch {
                fail(new HttpError(400, "Invalid JSON"));
            }
        });
        req.on("error", fail);
    });
}

/**
 * @param {number} port  0 picks a free port; read it from server.address().port
 * @param {() => object} getApi  resolved per request: re-login swaps the api instance
 * @param {number} [timeoutMs]
 * @returns {Promise<import("http").Server>} once listening on 127.0.0.1
 */
export function startControlServer(port, getApi, timeoutMs) {
    const server = createServer(async (req, res) => {
        try {
            if (req.method !== "POST" || req.url !== "/send-file") throw new HttpError(404, "Use POST /send-file");
            const host = req.headers.host ?? "";
            const { port: boundPort } = server.address();
            if (req.headers.origin || ![`127.0.0.1:${boundPort}`, `localhost:${boundPort}`].includes(host)) {
                throw new HttpError(403, "Browser or non-loopback requests are not allowed");
            }
            if (!(req.headers["content-type"] ?? "").startsWith("application/json")) {
                throw new HttpError(415, "Content-Type must be application/json");
            }
            const { threadId, paths, type = 0, caption = "" } = await readJson(req);
            const validPaths = Array.isArray(paths) && paths.length > 0 && paths.every((p) => typeof p === "string");
            if (
                typeof threadId !== "string" ||
                !threadId ||
                !validPaths ||
                ![0, 1].includes(Number(type)) ||
                typeof caption !== "string"
            ) {
                throw new HttpError(400, "Expected {threadId: string, paths: string[], type?: 0|1, caption?: string}");
            }
            const result = await sendFilesWithTimeout(
                getApi(),
                { caption, paths: paths.map((p) => resolve(p)) },
                threadId,
                Number(type),
                timeoutMs,
                "",
            );
            reply(res, 200, { ok: true, result });
        } catch (e) {
            const status = e instanceof HttpError ? e.status : e instanceof SendTimeoutError ? 504 : 502;
            const body = { ok: false, error: e.message };
            if (e instanceof SendTimeoutError) body.maybeSent = e.maybeSent;
            reply(res, status, body);
        }
    });
    return new Promise((ok, fail) => {
        server.once("error", fail);
        server.listen(port, "127.0.0.1", () => ok(server));
    });
}
