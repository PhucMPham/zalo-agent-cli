/**
 * Zalo Official Account API v3.0 client.
 * Wraps OA REST endpoints with node-fetch. No dependency on zca-js.
 * Credentials stored in ~/.zalo-agent/oa-credentials.json.
 */

import fs from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import nodefetch from "node-fetch";
import { buildUploadForm, MAX_FILE_BYTES, MAX_IMAGE_BYTES } from "../utils/upload-helpers.js";

const V3_BASE = "https://openapi.zalo.me/v3.0/oa";
const V2_BASE = "https://openapi.zalo.me/v2.0/oa";

const DATA_DIR = join(homedir(), ".zalo-agent");
const OA_CREDS_FILE = join(DATA_DIR, "oa-credentials.json");

/**
 * Swappable HTTP client. Production always uses node-fetch; tests inject a stub
 * to assert on the outgoing request without touching the network.
 */
let httpClient = nodefetch;

/** Replace the HTTP client. Test seam — not part of the public CLI surface. */
export function setHttpClient(fn) {
    httpClient = fn || nodefetch;
}

/** Ensure data directory exists. */
function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const OAUTH_URL = "https://oauth.zaloapp.com/v4/oa/permission";
const TOKEN_URL = "https://oauth.zaloapp.com/v4/oa/access_token";

/** Save full OA credentials to disk with restricted file permissions. */
export function saveOACreds(data, oaId = "default") {
    ensureDir();
    let creds = {};
    if (fs.existsSync(OA_CREDS_FILE)) {
        creds = JSON.parse(fs.readFileSync(OA_CREDS_FILE, "utf8"));
    }
    creds[oaId] = { ...creds[oaId], ...data, updatedAt: new Date().toISOString() };
    fs.writeFileSync(OA_CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

/** Save OA access token to disk (backward compat). */
export function saveOAToken(accessToken, oaId = "default") {
    saveOACreds({ accessToken }, oaId);
}

/** Load full OA credentials from disk. */
export function loadOACreds(oaId = "default") {
    if (!fs.existsSync(OA_CREDS_FILE)) return null;
    const creds = JSON.parse(fs.readFileSync(OA_CREDS_FILE, "utf8"));
    return creds[oaId] || null;
}

/** Load OA access token from disk. */
export function loadOAToken(oaId = "default") {
    return loadOACreds(oaId)?.accessToken || null;
}

/** Get token or throw. */
function getToken(oaId) {
    const creds = loadOACreds(oaId);
    if (!creds?.accessToken) {
        throw new Error("OA not configured. Run: zalo-agent oa login --app-id <id> --secret <key>");
    }
    return creds.accessToken;
}

/** Build OAuth authorization URL. */
export function getOAuthUrl(appId, redirectUri = "http://localhost:3456/callback") {
    const params = new URLSearchParams({
        app_id: appId,
        redirect_uri: redirectUri,
    });
    return `${OAUTH_URL}?${params}`;
}

/** Exchange authorization code for access + refresh tokens. */
export async function exchangeCode(code, appId, secretKey, redirectUri = "http://localhost:3456/callback") {
    const res = await httpClient(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: secretKey },
        body: new URLSearchParams({
            code,
            app_id: appId,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
        }),
    });
    return res.json();
}

/** Refresh access token using refresh token. */
export async function refreshAccessToken(refreshToken, appId, secretKey) {
    const res = await httpClient(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: secretKey },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            app_id: appId,
            grant_type: "refresh_token",
        }),
    });
    return res.json();
}

/** Make authenticated request to Zalo OA API. */
async function oaFetch(url, { method = "GET", body, token, isFormData = false } = {}) {
    const headers = { access_token: token };
    if (!isFormData) headers["Content-Type"] = "application/json";

    const opts = { method, headers };
    if (body && !isFormData) opts.body = JSON.stringify(body);
    if (body && isFormData) opts.body = body;

    const res = await httpClient(url, opts);
    const raw = await res.text();

    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        // Upload endpoints answer with HTML/plain text on 4xx/5xx — surface that instead of a parse error.
        throw new Error(`OA API returned non-JSON response (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }

    if (data.error && data.error !== 0) {
        throw new Error(`OA API error ${data.error}: ${data.message || JSON.stringify(data)}`);
    }
    return data;
}

// ─── Messaging (v3.0) ────────────────────────────────────────────────

const VALID_MSG_TYPES = ["cs", "transaction", "promotion"];

/** Validate messageType to prevent path injection. */
function validateMsgType(messageType) {
    if (!VALID_MSG_TYPES.includes(messageType)) {
        throw new Error(`Invalid message type "${messageType}". Must be: ${VALID_MSG_TYPES.join(", ")}`);
    }
    return messageType;
}

/** Send text message via OA. messageType: cs | transaction | promotion */
export async function sendText(userId, text, messageType = "cs", oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/message/${validateMsgType(messageType)}`, {
        method: "POST",
        token,
        body: { recipient: { user_id: userId }, message: { text } },
    });
}

/** Send image message via OA (by URL or attachment_id). */
export async function sendImage(userId, { imageUrl, imageId }, messageType = "cs", oaId = "default") {
    const token = getToken(oaId);
    const element = { media_type: "image" };
    if (imageUrl) element.url = imageUrl;
    else if (imageId) element.attachment_id = imageId;
    else throw new Error("Provide --image-url or --image-id");

    return oaFetch(`${V3_BASE}/message/${validateMsgType(messageType)}`, {
        method: "POST",
        token,
        body: {
            recipient: { user_id: userId },
            message: {
                attachment: {
                    type: "template",
                    payload: { template_type: "media", elements: [element] },
                },
            },
        },
    });
}

/** Send file message via OA (requires pre-uploaded file attachment_id). */
export async function sendFile(userId, fileId, messageType = "cs", oaId = "default") {
    if (!fileId)
        throw new Error("Missing file token. Upload the file first, or use: oa msg file <user-id> --file <path>");
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/message/${validateMsgType(messageType)}`, {
        method: "POST",
        token,
        body: {
            recipient: { user_id: userId },
            message: { attachment: { type: "file", payload: { token: fileId } } },
        },
    });
}

/** Send list message via OA. elements: [{ title, subtitle, image_url, default_action }] */
export async function sendList(userId, elements, messageType = "cs", oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/message/${validateMsgType(messageType)}`, {
        method: "POST",
        token,
        body: {
            recipient: { user_id: userId },
            message: {
                attachment: {
                    type: "template",
                    payload: { template_type: "list", elements },
                },
            },
        },
    });
}

/** Get message delivery status. */
export async function getMessageStatus(messageId, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/message/status?message_id=${messageId}`, { token });
}

// ─── User / Follower Management ──────────────────────────────────────

/** Get OA profile info. */
export async function getOAProfile(oaId = "default") {
    const token = getToken(oaId);
    // v2 fallback — v3 docs incomplete for getoa
    return oaFetch(`${V2_BASE}/getoa`, { token });
}

/** Get follower info by user_id. */
export async function getFollowerInfo(userId, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/user/detail?user_id=${userId}`, { token });
}

/** Get followers list (paginated). */
export async function getFollowers(offset = 0, count = 50, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/user/getlist?offset=${offset}&count=${count}`, { token });
}

/** Update follower info (name, phone, address, etc.). */
export async function updateFollowerInfo(userId, updates, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/user/update`, {
        method: "POST",
        token,
        body: { user_id: userId, ...updates },
    });
}

// ─── Tags ────────────────────────────────────────────────────────────

/** Get all tags. */
export async function getTags(oaId = "default") {
    const token = getToken(oaId);
    // v2 endpoint — v3 not documented
    return oaFetch(`${V2_BASE}/tag/gettagsofoa`, { token });
}

/** Assign tag to follower. */
export async function assignTag(userId, tagName, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/tag/taguser`, {
        method: "POST",
        token,
        body: { user_id: userId, tag_name: tagName },
    });
}

/** Remove tag. */
export async function removeTag(tagName, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/tag/rmtag`, {
        method: "POST",
        token,
        body: { tag_name: tagName },
    });
}

/** Remove follower from tag. */
export async function removeFollowerFromTag(userId, tagName, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/tag/rmfollowerfromtag`, {
        method: "POST",
        token,
        body: { user_id: userId, tag_name: tagName },
    });
}

// ─── Media Upload ────────────────────────────────────────────────────

/**
 * Upload image to OA (returns attachment_id).
 * Uploads live on v2.0 — Zalo publishes no v3.0 upload endpoint.
 */
export async function uploadImage(filePath, oaId = "default") {
    const token = getToken(oaId);
    const form = buildUploadForm(filePath, { maxBytes: MAX_IMAGE_BYTES, label: "Image" });

    return oaFetch(`${V2_BASE}/upload/image`, {
        method: "POST",
        token,
        body: form,
        isFormData: true,
    });
}

/** Upload file to OA (returns a token usable with sendFile). */
export async function uploadFile(filePath, oaId = "default") {
    const token = getToken(oaId);
    const form = buildUploadForm(filePath, { maxBytes: MAX_FILE_BYTES, label: "File" });

    return oaFetch(`${V2_BASE}/upload/file`, {
        method: "POST",
        token,
        body: form,
        isFormData: true,
    });
}

/** Extract the attachment token from an upload/file response. */
export function extractUploadToken(result) {
    return result?.data?.token || result?.token || null;
}

/** Extract the attachment_id from an upload/image response. */
export function extractAttachmentId(result) {
    return result?.data?.attachment_id || result?.attachment_id || null;
}

/**
 * Upload a local file and send it to a follower in one step.
 *
 * If the send fails after the upload succeeded, the error carries the already
 * uploaded `fileToken` so the caller can retry delivery without re-uploading.
 */
export async function uploadAndSendFile(userId, filePath, messageType = "cs", oaId = "default") {
    const upload = await uploadFile(filePath, oaId);
    const fileToken = extractUploadToken(upload);
    if (!fileToken) {
        throw new Error(`Upload succeeded but returned no file token: ${JSON.stringify(upload)}`);
    }

    let result;
    try {
        result = await sendFile(userId, fileToken, messageType, oaId);
    } catch (e) {
        // The upload is already paid for — most send failures (wrong user id, expired
        // CS window, rate limit) are retriable with this same token.
        e.fileToken = fileToken;
        throw e;
    }
    return { upload, fileToken, result };
}

// ─── Conversations ───────────────────────────────────────────────────

/** Get recent chat list (v2 API). */
export async function getRecentChat(offset = 0, count = 10, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V2_BASE}/listrecentchat?offset=${offset}&count=${count}`, { token });
}

/** Get conversation history with a user (v2 API). */
export async function getConversation(userId, offset = 0, count = 10, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V2_BASE}/conversation?user_id=${userId}&offset=${offset}&count=${count}`, {
        token,
    });
}

// ─── Menu ────────────────────────────────────────────────────────────

/** Update OA menu. */
export async function updateMenu(menuData, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/menu`, { method: "POST", token, body: menuData });
}

// ─── Articles ────────────────────────────────────────────────────────

/** Create article (broadcast). */
export async function createArticle(articleData, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/article/create`, { method: "POST", token, body: articleData });
}

/** Get article list. */
export async function getArticleList(offset = 0, limit = 10, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/article/getlist?offset=${offset}&limit=${limit}`, { token });
}

/** Get article detail. */
export async function getArticleDetail(articleId, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/article/getdetail?id=${articleId}`, { token });
}

// ─── Store ───────────────────────────────────────────────────────────

/** Create product in OA store. */
export async function createProduct(productData, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/store/product/create`, { method: "POST", token, body: productData });
}

/** Get product list. */
export async function getProductList(offset = 0, limit = 10, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/store/product/getproductofoa?offset=${offset}&limit=${limit}`, {
        token,
    });
}

/** Get product detail. */
export async function getProductInfo(productId, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/store/product/getproduct?id=${productId}`, { token });
}

/** Create category in OA store. */
export async function createCategory(categoryData, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/store/category/create`, {
        method: "POST",
        token,
        body: categoryData,
    });
}

/** Get category list. */
export async function getCategoryList(oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/store/category/getcategoryofoa`, { token });
}

/** Create order. */
export async function createOrder(orderData, oaId = "default") {
    const token = getToken(oaId);
    return oaFetch(`${V3_BASE}/store/order/create`, { method: "POST", token, body: orderData });
}
