/**
 * Extract readable text from non-string Zalo message content.
 * Handles reply/quote messages, bubble messages, recommendations, link previews, etc.
 *
 * Field priority: params.message → description → title → text → msg → href → content (string) → JSON fallback
 */
export function extractMessageText(content, msgType) {
    if (!content || typeof content !== "object") return `[${msgType || "attachment"}]`;
    if (content.params?.message) return content.params.message;
    if (content.description) return content.description;
    if (content.title) return content.title;
    if (content.text) return content.text;
    if (content.msg) return content.msg;
    if (content.href) return content.href;
    if (content.content && typeof content.content === "string") return content.content;
    try {
        const str = JSON.stringify(content);
        if (str.length < 200) return `[${msgType || "object"}: ${str}]`;
    } catch {}
    return `[${msgType || "attachment"}]`;
}
