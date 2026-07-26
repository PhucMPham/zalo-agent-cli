/**
 * Reconnect backoff for the MCP Zalo listener.
 *
 * When another Zalo web session evicts ours, Zalo closes the socket with a plain
 * code-1000 (not the 3000 duplicate frame), so the listener would otherwise retry
 * every 5s forever. This computes an exponential backoff (capped) driven by the
 * count of consecutive rapid closes, so a losing instance stops hammering while
 * still recovering automatically if the rival session goes away.
 */

/** First retry delay (ms). */
export const RECONNECT_BASE_MS = 5000;
/** Maximum retry delay when thrashing (ms). */
export const RECONNECT_MAX_MS = 5 * 60 * 1000;

/**
 * Exponential backoff with a cap.
 * rapidCloses 0 or 1 → base delay; each additional rapid close doubles it, up to the cap.
 * @param {number} rapidCloses - Consecutive closes that happened before the connection was stable
 * @param {number} [base=RECONNECT_BASE_MS]
 * @param {number} [max=RECONNECT_MAX_MS]
 * @returns {number} Delay in ms
 */
export function reconnectDelay(rapidCloses, base = RECONNECT_BASE_MS, max = RECONNECT_MAX_MS) {
    const exponent = Math.max(0, (Number(rapidCloses) || 0) - 1);
    return Math.min(base * 2 ** exponent, max);
}
