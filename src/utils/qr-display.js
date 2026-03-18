/**
 * Cross-platform QR display utility.
 * Displays Zalo's official QR PNG inline in terminal and saves to file.
 *
 * IMPORTANT: Uses Zalo-server-generated PNG (via event.data.image base64),
 * NOT qrcode-terminal which re-encodes the token text into a different QR
 * that Zalo app cannot recognize as a login request.
 *
 * Display methods:
 * 1. iTerm2/Kitty/WezTerm inline image (renders PNG directly in terminal)
 * 2. Save PNG to config dir
 * 3. Base64 data URL (for IDE/agent preview)
 * 4. File path with platform-specific open hint
 */

import { resolve } from "path";
import { writeFileSync, mkdirSync } from "fs";
import { platform } from "os";
import { CONFIG_DIR } from "../core/credentials.js";
import { info } from "./output.js";

const QR_PATH = resolve(CONFIG_DIR, "qr.png");

/** Get platform-specific command to open a file. */
function getOpenCommand() {
    switch (platform()) {
        case "darwin":
            return "open";
        case "win32":
            return "start";
        default:
            return "xdg-open";
    }
}

/**
 * Display QR code from a zca-js login QR event.
 * Synchronous — safe to call from zca-js callback.
 * In JSON mode (--json), outputs structured event for AI agents.
 * @param {object} event - zca-js QR callback event
 */
export function displayQR(event) {
    const imageB64 = event.data?.image || "";
    const jsonMode = process.env.ZALO_JSON_MODE === "1";

    // Always save PNG to config dir (needed by HTTP server and agents)
    if (imageB64) {
        try {
            mkdirSync(CONFIG_DIR, { recursive: true });
            writeFileSync(QR_PATH, Buffer.from(imageB64, "base64"));
        } catch {}
    }

    // Also fire-and-forget the zca-js built-in save
    if (event.actions?.saveToFile) {
        event.actions.saveToFile(QR_PATH).catch(() => {});
    }

    // JSON mode: structured output for AI agents — no terminal escapes, no noise
    if (jsonMode) {
        if (imageB64) {
            console.log(JSON.stringify({
                event: "qr",
                image: imageB64,
                file: QR_PATH,
                dataUrl: `data:image/png;base64,${imageB64}`,
            }));
        }
        return;
    }

    // Human mode: terminal inline image + hints
    if (imageB64) {
        // iTerm2/Kitty/WezTerm inline image protocol
        const b64ForTerm = Buffer.from(imageB64, "base64").toString("base64");
        process.stdout.write(`\x1b]1337;File=inline=1;width=30;preserveAspectRatio=1:${b64ForTerm}\x07\n`);

        const openCmd = getOpenCommand();
        info(`QR image saved: ${QR_PATH}`);
        info(`To open: ${openCmd} "${QR_PATH}"`);
        info("Copy this URL and paste in any browser to view QR:");
        console.log(`data:image/png;base64,${imageB64}`);
    }
}

/** Get the QR image path. */
export function getQRPath() {
    return QR_PATH;
}
