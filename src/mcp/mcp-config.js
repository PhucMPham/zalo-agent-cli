/**
 * Load/save MCP-specific config from ~/.zalo-agent-cli/mcp-config.json.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { CONFIG_DIR } from "../core/credentials.js";

const MCP_CONFIG_FILE = join(CONFIG_DIR, "mcp-config.json");

/** Default MCP config — sensible defaults for local development */
export function getDefaultConfig() {
    return {
        watchThreads: ["dm:*", "group:*"],
        mode: "manual",
        triggerKeywords: ["@bot"],
        notify: {
            enabled: false,
            thread: null,
            on: ["dm"],
            cooldown: "5m",
        },
        limits: {
            maxMessagesPerPoll: 20,
            autoDigestThreshold: 50,
            bufferMaxAge: "2h",
            bufferMaxSize: 500,
            historyMaxPerThread: 2000, // messages retained per thread in the history store
            historyBackfillPages: 5, // pages of old-message backfill fetched per thread type on connect
            historyBackfillPageTimeout: "8s", // per-page wait for a backfill response
        },
        media: {
            downloadDir: null, // default: ~/.zalo-agent-cli/media/
            autoOpen: true,
        },
    };
}

/**
 * Load MCP config from disk, merged with defaults.
 * @returns {object} MCP config
 */
export function loadMCPConfig() {
    const defaults = getDefaultConfig();
    try {
        const raw = readFileSync(MCP_CONFIG_FILE, "utf-8");
        const saved = JSON.parse(raw);
        // Shallow merge: saved values override defaults
        return {
            ...defaults,
            ...saved,
            notify: { ...defaults.notify, ...saved.notify },
            limits: { ...defaults.limits, ...saved.limits },
            media: { ...defaults.media, ...saved.media },
        };
    } catch {
        // File doesn't exist or invalid JSON — use defaults
        return defaults;
    }
}

/**
 * Save MCP config to disk.
 * @param {object} config
 */
export function saveMCPConfig(config) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Parse duration string (e.g. "2h", "5m", "30s") to milliseconds.
 * @param {string|number} duration
 * @returns {number} Milliseconds
 */
export function parseDuration(duration) {
    if (typeof duration === "number") return duration;
    const match = String(duration).match(/^(\d+)\s*(h|m|s|ms)?$/i);
    if (!match) return 0;
    const value = parseInt(match[1], 10);
    const unit = (match[2] || "ms").toLowerCase();
    const multipliers = { h: 3600000, m: 60000, s: 1000, ms: 1 };
    return value * (multipliers[unit] || 1);
}
