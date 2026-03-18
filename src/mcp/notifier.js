/**
 * Sends notification to a configured Zalo group when DMs arrive
 * and no MCP agent is connected. Batches messages within a cooldown window.
 */

import { parseDuration } from "./mcp-config.js";

export class ZaloNotifier {
    /**
     * @param {object} api - zca-js API instance
     * @param {object} config - Full MCP config (uses config.notify section)
     * @param {boolean} config.notify.enabled
     * @param {string|null} config.notify.thread - Group ID to send notifications to
     * @param {string[]} config.notify.on - Event types to notify on (e.g. ["dm"])
     * @param {string} config.notify.cooldown - Debounce window (e.g. "5m")
     */
    constructor(api, config) {
        this._api = api;
        this._enabled = config.notify?.enabled || false;
        this._notifyThread = config.notify?.thread || null;
        this._onTypes = new Set(config.notify?.on || ["dm"]);
        this._cooldownMs = parseDuration(config.notify?.cooldown || "5m");
        this._pending = []; // Messages queued during cooldown window
        this._timer = null;
        this._agentConnected = false;
    }

    /** Mark agent as connected/disconnected — suppresses notifications when connected */
    setAgentConnected(connected) {
        this._agentConnected = connected;
    }

    /**
     * Called when a new message arrives. Queues notification if conditions are met.
     * @param {object} message - Normalized message object
     */
    onMessage(message) {
        if (!this._shouldNotify(message)) return;
        this._pending.push(message);
        // Start cooldown timer only once per batch window
        if (!this._timer) {
            this._timer = setTimeout(() => this._flush(), this._cooldownMs);
        }
    }

    /**
     * Determine whether this message warrants a notification.
     * @param {object} message
     * @returns {boolean}
     */
    _shouldNotify(message) {
        if (!this._enabled || !this._notifyThread) return false;
        if (this._agentConnected) return false;
        return this._onTypes.has(message.threadType);
    }

    /** Flush pending notifications as a single batched message to the notify thread */
    async _flush() {
        this._timer = null;
        if (this._pending.length === 0) return;

        const count = this._pending.length;
        const preview = this._pending
            .slice(0, 3) // Show at most 3 message previews
            .map((m) => `- ${m.senderName || m.senderId}: ${(m.text || "").slice(0, 50)}`)
            .join("\n");

        const suffix = count > 3 ? `\n...và ${count - 3} tin nhắn khác` : "";
        const text = `🔔 ${count} tin nhắn mới trong ${this._formatWindow()}:\n${preview}${suffix}`;

        try {
            // threadType 1 = Group conversation
            await this._api.sendMessage(text, this._notifyThread, 1);
        } catch (err) {
            console.error("Notifier send failed:", err.message);
        }

        this._pending = [];
    }

    /** Format cooldown duration as human-readable string (e.g. "5 phút", "1h") */
    _formatWindow() {
        const mins = Math.round(this._cooldownMs / 60000);
        return mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins} phút`;
    }

    /** Clean up pending timer on shutdown and attempt final flush */
    destroy() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._flush();
        }
    }
}
