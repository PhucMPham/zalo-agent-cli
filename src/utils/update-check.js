/**
 * Non-blocking update check — warns if a newer version is on npm.
 *
 * Uses the registry HTTP API so we never spawn `npm view`. On Windows,
 * `execSync("npm view …")` opens a cmd.exe window that does not auto-close
 * (issues #5 and #9). MCP stdio / --json skip the check entirely: stdout is
 * the JSON-RPC transport, and a version nag is noise.
 */

import { execSync } from "node:child_process";
import { warning } from "./output.js";

const REGISTRY_LATEST = "https://registry.npmjs.org/zalo-agent-cli/latest";
const CHECK_TIMEOUT_MS = 5000;

/**
 * Compare dotted numeric versions. True only when `latest` is strictly newer.
 * A local version ahead of the registry (unpublished) must not nag.
 * @param {string} latest
 * @param {string} current
 * @returns {boolean}
 */
export function isNewerVersion(latest, current) {
    const a = String(latest)
        .split(".")
        .map((n) => Number.parseInt(n, 10) || 0);
    const b = String(current)
        .split(".")
        .map((n) => Number.parseInt(n, 10) || 0);
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if ((a[i] || 0) > (b[i] || 0)) return true;
        if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
}

/**
 * Skip the check in machine-output modes (MCP stdio, --json).
 * @param {boolean} jsonMode
 * @returns {boolean}
 */
export function shouldSkipUpdateCheck(jsonMode) {
    return Boolean(jsonMode || process.env.ZALO_JSON_MODE);
}

/**
 * Fire-and-forget registry lookup. Never blocks CLI startup.
 * @param {string} currentVersion
 * @param {boolean} jsonMode
 * @returns {Promise<void>}
 */
export function checkForUpdates(currentVersion, jsonMode) {
    if (shouldSkipUpdateCheck(jsonMode)) return Promise.resolve();
    return fetchLatestAndWarn(currentVersion);
}

/**
 * @param {string} currentVersion
 * @returns {Promise<void>}
 */
async function fetchLatestAndWarn(currentVersion) {
    try {
        const res = await fetch(REGISTRY_LATEST, {
            signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
            headers: { accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const latest = String(data?.version || "").trim();
        if (latest && isNewerVersion(latest, currentVersion)) {
            warning(`Update available: ${currentVersion} → ${latest}. Run: zalo-agent update`);
        }
    } catch {
        // Silent failure — network/timeout must not block CLI usage
    }
}

/**
 * Self-update by running npm install -g.
 * windowsHide: a visible console window is noise if npm.cmd is spawned on Windows.
 * @returns {boolean} success
 */
export function selfUpdate() {
    try {
        execSync("npm install -g zalo-agent-cli@latest", {
            encoding: "utf8",
            stdio: "inherit",
            timeout: 60000,
            windowsHide: true,
        });
        return true;
    } catch {
        return false;
    }
}
