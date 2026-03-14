/**
 * Zalo client wrapper — direct zca-js API calls with proxy support.
 * Manages a single Zalo instance per process. Swap on account switch.
 */

import fs from "fs";
import { Zalo, LoginQRCallbackEventType } from "zca-js";
import { HttpsProxyAgent } from "https-proxy-agent";
import nodefetch from "node-fetch";
import { getActive } from "./accounts.js";
import { loadCredentials } from "./credentials.js";
import { info } from "../utils/output.js";

/**
 * Read image dimensions from file header bytes (PNG, JPEG, GIF).
 * Returns { width, height, size } or null on failure.
 */
async function readImageMetadata(filePath) {
    const stat = await fs.promises.stat(filePath);
    const buf = Buffer.alloc(32);
    const fh = await fs.promises.open(filePath, "r");
    try {
        await fh.read(buf, 0, 32, 0);
    } finally {
        await fh.close();
    }

    let width = 0;
    let height = 0;

    // PNG: bytes 0-3 = 0x89504E47, width at 16, height at 20 (big-endian)
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        width = buf.readUInt32BE(16);
        height = buf.readUInt32BE(20);
    }
    // GIF: "GIF87a" or "GIF89a", width at 6, height at 8 (little-endian)
    else if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
        width = buf.readUInt16LE(6);
        height = buf.readUInt16LE(8);
    }
    // JPEG: 0xFFD8
    else if (buf[0] === 0xff && buf[1] === 0xd8) {
        // Need to scan SOF markers for dimensions
        const full = await fs.promises.readFile(filePath);
        for (let i = 2; i < full.length - 9; ) {
            if (full[i] !== 0xff) break;
            const marker = full[i + 1];
            // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15
            if (
                (marker >= 0xc0 && marker <= 0xc3) ||
                (marker >= 0xc5 && marker <= 0xc7) ||
                (marker >= 0xc9 && marker <= 0xcb) ||
                (marker >= 0xcd && marker <= 0xcf)
            ) {
                height = full.readUInt16BE(i + 5);
                width = full.readUInt16BE(i + 7);
                break;
            }
            // Skip segment
            const segLen = full.readUInt16BE(i + 2);
            i += 2 + segLen;
        }
    }

    if (width === 0 || height === 0) return null;
    return { width, height, size: stat.size };
}

let _api = null;
let _ownId = null;

/** Get the current API instance or throw. */
export function getApi() {
    if (!_api) throw new Error("Not logged in. Run: zalo-agent login");
    return _api;
}

/** Get current owner ID. */
export function getOwnId() {
    return _ownId;
}

/** Check if logged in. */
export function isLoggedIn() {
    return _api !== null;
}

/** Create a Zalo instance with optional proxy. Suppress logs in JSON mode. */
function createZalo(proxyUrl) {
    const opts = {
        // Suppress zca-js internal INFO logs when --json to keep stdout clean
        logging: !process.env.ZALO_JSON_MODE,
        imageMetadataGetter: readImageMetadata,
    };
    if (proxyUrl) {
        opts.agent = new HttpsProxyAgent(proxyUrl);
        opts.polyfill = nodefetch;
    }
    return new Zalo(opts);
}

/** Set the active API + ownId (used after login). */
function setSession(api, ownId) {
    _api = api;
    _ownId = ownId;
}

/** Clear current session. */
export function clearSession() {
    _api = null;
    _ownId = null;
}

/**
 * Login with saved credentials + proxy.
 * @param {object} creds - {imei, cookie, userAgent, language?}
 * @param {string|null} proxyUrl
 * @returns {object} - {api, ownId}
 */
export async function loginWithCredentials(creds, proxyUrl = null) {
    const zalo = createZalo(proxyUrl);
    const api = await zalo.login(creds);
    const ownId = api.getOwnId?.() || null;
    setSession(api, ownId);
    return { api, ownId };
}

/**
 * Login via QR code with optional proxy.
 * @param {string|null} proxyUrl
 * @param {function} onQrGenerated - callback(qrData) when QR is ready
 * @returns {object} - {api, ownId}
 */
export async function loginWithQR(proxyUrl = null, onQrGenerated = null) {
    const zalo = createZalo(proxyUrl);

    const api = await zalo.loginQR(null, (event) => {
        if (event.type === LoginQRCallbackEventType.QRCodeGenerated && onQrGenerated) {
            onQrGenerated(event);
        }
    });

    const ownId = api.getOwnId?.() || null;
    setSession(api, ownId);
    return { api, ownId };
}

/**
 * Extract credentials from current session for saving.
 * @returns {object} - {imei, cookie, userAgent, language}
 */
export function extractCredentials() {
    const api = getApi();
    const ctx = api.getContext();
    return {
        imei: ctx.imei,
        cookie: ctx.cookie,
        userAgent: ctx.userAgent,
        language: ctx.language,
    };
}

/**
 * Auto-login using active account from registry.
 * Called before commands that need authentication.
 * @param {boolean} jsonMode - suppress output in JSON mode
 */
export async function autoLogin(jsonMode = false) {
    if (_api) return; // Already logged in

    const active = getActive();
    if (!active) return;

    const creds = loadCredentials(active.ownId);
    if (!creds) return;

    try {
        await loginWithCredentials(creds, active.proxy || null);
        if (!jsonMode) {
            info(`Auto-login: ${active.name || active.ownId}`);
        }
    } catch {
        // Silent failure — user can login manually
    }
}
