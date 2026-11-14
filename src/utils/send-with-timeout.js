/**
 * zca-js waits, with no timeout, for a `file_done` WebSocket event after uploading
 * a non-image file. That event only reaches a process whose listener is running,
 * so without one sendMessage never settles. Bound the wait so callers see a failure.
 */

import { AsyncLocalStorage } from "async_hooks";
import { extname } from "path";

export const SEND_FILE_TIMEOUT_MS = 60_000;

export const NO_LISTENER_HINT =
    " Non-image files need a running listener: send through `zalo-agent listen --control-port`.";

/** `maybeSent` false: cancelled, safe to retry. true: the send may still complete, do not retry. */
export class SendTimeoutError extends Error {
    constructor(message, maybeSent) {
        super(message);
        this.maybeSent = maybeSent;
    }
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
/** zca-js sendMessage.js: caption sent inline for a single image, extension matched case-sensitively. */
const captionInline = (p) => IMAGE_EXTS.includes(extname(p).slice(1));
/** zca-js uploadAttachment.js lowercases the extension; images and lowercase .gif never wait for `file_done`. */
const waitsForFileDone = (p) => {
    const ext = extname(p).slice(1);
    return ext !== "gif" && !IMAGE_EXTS.includes(ext.toLowerCase());
};

const sendScope = new AsyncLocalStorage();
const TRACKED = Symbol("send-with-timeout.tracked");

/**
 * zca-js parks each non-image upload in `ctx.uploadCallbacks` until `file_done` arrives;
 * the message is only sent once every callback has fired. Tag each registration with
 * the send that made it, so a timed-out send can drop its callbacks, including ones
 * registered after the timeout when the upload response was slow.
 */
function trackUploadCallbacks(api) {
    const callbacks = api.getContext?.()?.uploadCallbacks;
    if (!callbacks || callbacks[TRACKED]) return;
    const set = callbacks.set.bind(callbacks);
    callbacks.set = (key, value, ...rest) => {
        const scope = sendScope.getStore();
        if (!scope) return set(key, value, ...rest);
        if (scope.cancelled) return callbacks;
        scope.registered++;
        scope.pending.add(key);
        const confirm = (...args) => {
            scope.pending.delete(key);
            return value(...args);
        };
        return set(key, confirm, ...rest);
    };
    callbacks[TRACKED] = true;
}

function withTimeout(api, paths, run, ms, hint) {
    const waiting = paths.filter(waitsForFileDone).length;
    if (waiting === 0) return run(); // nothing can hang; a timer would only abort slow uploads
    trackUploadCallbacks(api);
    const scope = { pending: new Set(), registered: 0, cancelled: false };
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const callbacks = api.getContext?.()?.uploadCallbacks;
            // Cancellable only while an upload that waits for `file_done` is unregistered or
            // unconfirmed: the message waits on it. Otherwise only hashing and the final request remain.
            const confirmedAll = scope.pending.size === 0 && scope.registered === waiting;
            scope.cancelled = !confirmedAll;
            if (scope.cancelled) for (const key of scope.pending) callbacks?.delete(key);
            const outcome = confirmedAll
                ? " The send may still complete: do not retry."
                : " The send was cancelled and nothing was delivered.";
            reject(
                new SendTimeoutError(
                    `Send timed out after ${ms / 1000}s waiting for Zalo upload confirmation.${outcome}${confirmedAll ? "" : hint}`,
                    confirmedAll,
                ),
            );
        }, ms);
    });
    return Promise.race([sendScope.run(scope, run), timeout]).finally(() => clearTimeout(timer));
}

/**
 * Send files, then the caption. zca-js would otherwise post the caption before
 * uploading, leaving a lone caption behind when the upload times out.
 * A caption failure does not throw (the files are already delivered): it is
 * returned as `captionError`.
 */
export async function sendFilesWithTimeout(
    api,
    { caption = "", paths },
    threadId,
    type,
    ms = SEND_FILE_TIMEOUT_MS,
    hint = NO_LISTENER_HINT,
) {
    const inline = paths.length === 1 && captionInline(paths[0]);
    const result = await withTimeout(
        api,
        paths,
        () => api.sendMessage({ msg: inline ? caption : "", attachments: paths }, threadId, type),
        ms,
        hint,
    );
    if (caption && !inline) {
        try {
            result.message = (await api.sendMessage(caption, threadId, type)).message;
        } catch (e) {
            result.captionError = e.message;
        }
    }
    return result;
}
