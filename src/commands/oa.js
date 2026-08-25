/**
 * Official Account (OA) commands — manage Zalo OA via REST API v3.0.
 * Independent from zca-js personal account; uses separate OA access token.
 */

import { resolve } from "node:path";
import { registerOAListenCommand } from "./oa-listen.js";
import { registerOAInitCommand } from "./oa-init.js";
import {
    saveOAToken,
    saveOACreds,
    loadOACreds,
    getOAuthUrl,
    exchangeCode,
    refreshAccessToken,
    sendText,
    sendImage,
    sendFile,
    sendList,
    getMessageStatus,
    getOAProfile,
    getFollowerInfo,
    getFollowers,
    updateFollowerInfo,
    getTags,
    assignTag,
    removeTag,
    removeFollowerFromTag,
    uploadImage,
    uploadFile,
    uploadAndSendFile,
    extractUploadToken,
    extractAttachmentId,
    getRecentChat,
    getConversation,
    updateMenu,
    createArticle,
    getArticleList,
    getArticleDetail,
    createProduct,
    getProductList,
    getProductInfo,
    createCategory,
    getCategoryList,
    createOrder,
} from "../core/oa-client.js";
import { success, error, info, output } from "../utils/output.js";

export function registerOACommands(program) {
    const oa = program.command("oa").description("Zalo Official Account API v3.0 commands");
    const json = () => program.opts().json;

    // ─── Login & Auth ───────────────────────────────────────────────

    oa.command("login")
        .description("Login to Zalo OA via OAuth (opens browser, starts callback server)")
        .requiredOption("--app-id <id>", "Zalo App ID from developers.zalo.me")
        .requiredOption("--secret <key>", "Zalo App Secret Key")
        .option("-p, --port <port>", "Callback server port", "3456")
        .option("--callback-host <host>", "Callback host for VPS (e.g. https://your-vps.com)")
        .option("--oa-id <id>", "OA identifier for multi-OA support", "default")
        .action(async (opts) => {
            const { createServer } = await import("node:http");
            const callbackBase = opts.callbackHost || `http://localhost:${opts.port}`;
            const redirectUri = `${callbackBase}/callback`;
            const authUrl = getOAuthUrl(opts.appId, redirectUri);

            if (!json()) {
                if (opts.callbackHost) {
                    info("VPS mode — open this URL in your local browser:");
                } else {
                    info("Opening browser for Zalo OA authorization...");
                }
                info(`Auth URL:\n  ${authUrl}\n`);
            }

            // Open browser (skip on VPS/headless — user copies URL manually)
            if (!opts.callbackHost) {
                const { exec } = await import("node:child_process");
                const openCmd =
                    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
                exec(`${openCmd} "${authUrl}"`);
            }

            // Start callback server to receive authorization code
            const server = createServer(async (req, res) => {
                if (!req.url?.startsWith("/callback")) {
                    res.writeHead(404);
                    res.end();
                    return;
                }
                const url = new URL(req.url, `http://localhost:${opts.port}`);
                const code = url.searchParams.get("code");
                const oaId = url.searchParams.get("oa_id");

                if (!code) {
                    const errMsg = url.searchParams.get("error_description") || "No authorization code received";
                    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                    res.end(`<h2>Login failed</h2><p>${errMsg}</p>`);
                    if (!json()) error(errMsg);
                    server.close();
                    return;
                }

                try {
                    // Exchange code for tokens
                    const tokenData = await exchangeCode(code, opts.appId, opts.secret, redirectUri);

                    if (tokenData.error) {
                        throw new Error(
                            `Token error ${tokenData.error}: ${tokenData.error_description || tokenData.error_name}`,
                        );
                    }

                    // Save all credentials
                    saveOACreds(
                        {
                            appId: opts.appId,
                            secretKey: opts.secret,
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token,
                            expiresIn: tokenData.expires_in,
                            oaId: oaId || opts.oaId,
                        },
                        opts.oaId,
                    );

                    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    res.end("<h2>Login successful!</h2><p>You can close this tab and return to the terminal.</p>");

                    output({ ok: true, oaId: oaId || opts.oaId, expires_in: tokenData.expires_in }, json(), () => {
                        success(`OA logged in successfully (OA ID: ${oaId || opts.oaId})`);
                        info(
                            `Token expires in ${Math.round((tokenData.expires_in || 86400) / 3600)}h — use 'oa refresh' to renew`,
                        );
                    });
                } catch (e) {
                    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
                    res.end(`<h2>Login failed</h2><p>${e.message}</p>`);
                    error(e.message);
                } finally {
                    server.close();
                }
            });

            // Bind to 0.0.0.0 on VPS so external traffic can reach callback
            const bindHost = opts.callbackHost ? "0.0.0.0" : "127.0.0.1";
            server.listen(Number(opts.port), bindHost, () => {
                if (!json()) info(`Waiting for callback on ${bindHost}:${opts.port}...`);
            });

            // Timeout after 2 minutes
            setTimeout(() => {
                if (!json()) warning("Login timed out (2 min). Try again.");
                server.close();
                process.exit(1);
            }, 120_000);
        });

    oa.command("refresh")
        .description("Refresh OA access token using stored refresh token")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const creds = loadOACreds(opts.oaId);
                if (!creds?.refreshToken || !creds?.appId || !creds?.secretKey) {
                    throw new Error("Missing credentials. Run: zalo-agent oa login --app-id <id> --secret <key>");
                }
                const tokenData = await refreshAccessToken(creds.refreshToken, creds.appId, creds.secretKey);
                if (tokenData.error) {
                    throw new Error(
                        `Refresh error ${tokenData.error}: ${tokenData.error_description || tokenData.error_name}`,
                    );
                }
                saveOACreds(
                    {
                        accessToken: tokenData.access_token,
                        refreshToken: tokenData.refresh_token,
                        expiresIn: tokenData.expires_in,
                    },
                    opts.oaId,
                );
                output({ ok: true, expires_in: tokenData.expires_in }, json(), () =>
                    success(`Token refreshed. Expires in ${Math.round((tokenData.expires_in || 86400) / 3600)}h`),
                );
            } catch (e) {
                error(e.message);
            }
        });

    oa.command("setup <access-token>")
        .description("Manually set OA access token (skip OAuth)")
        .option("--oa-id <id>", "OA identifier for multi-OA support", "default")
        .action(async (accessToken, opts) => {
            try {
                saveOAToken(accessToken, opts.oaId);
                output({ ok: true, oaId: opts.oaId }, json(), () => success(`OA token saved for "${opts.oaId}"`));
            } catch (e) {
                error(e.message);
            }
        });

    oa.command("whoami")
        .description("Show current OA profile info")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const result = await getOAProfile(opts.oaId);
                output(result, json(), () => {
                    const d = result.data || result;
                    info(`OA: ${d.name || "N/A"} (ID: ${d.oa_id || "N/A"})`);
                    if (d.description) info(`Description: ${d.description}`);
                    if (d.num_follower !== null && d.num_follower !== undefined) info(`Followers: ${d.num_follower}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Messaging ───────────────────────────────────────────────────

    const msg = oa.command("msg").description("Send messages to OA followers");

    msg.command("text <user-id> <text>")
        .description("Send text message to a follower")
        .option("-m, --msg-type <type>", "Message type: cs | transaction | promotion", "cs")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, text, opts) => {
            try {
                const result = await sendText(userId, text, opts.msgType, opts.oaId);
                output(result, json(), () => success("Text message sent"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("image <user-id>")
        .description("Send image message to a follower")
        .option("--image-url <url>", "Image URL")
        .option("--image-id <id>", "Pre-uploaded image attachment_id")
        .option("-m, --msg-type <type>", "Message type: cs | transaction | promotion", "cs")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, opts) => {
            try {
                const result = await sendImage(
                    userId,
                    { imageUrl: opts.imageUrl, imageId: opts.imageId },
                    opts.msgType,
                    opts.oaId,
                );
                output(result, json(), () => success("Image message sent"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("file <user-id> [file-id]")
        .description("Send file message — pass an uploaded token, or --file <path> to upload and send in one step")
        .option("-f, --file <path>", "Local file to upload and send")
        .option("-m, --msg-type <type>", "Message type: cs | transaction | promotion", "cs")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, fileId, opts) => {
            try {
                if (!opts.file && !fileId) {
                    throw new Error("Provide an uploaded <file-id> token or --file <path>");
                }
                if (opts.file) {
                    const { fileToken, result } = await uploadAndSendFile(
                        userId,
                        resolve(opts.file),
                        opts.msgType,
                        opts.oaId,
                    );
                    output({ ...result, fileToken }, json(), () => success(`File uploaded and sent (${fileToken})`));
                    return;
                }
                const result = await sendFile(userId, fileId, opts.msgType, opts.oaId);
                output(result, json(), () => success("File message sent"));
            } catch (e) {
                error(e.message);
                if (e.fileToken) {
                    info(`File is already uploaded — retry the send without re-uploading:`);
                    info(`  zalo-agent oa msg file ${userId} ${e.fileToken}`);
                }
            }
        });

    msg.command("list <user-id> <elements-json>")
        .description('Send list message. elements-json: \'[{"title":"...", "subtitle":"..."}]\'')
        .option("-m, --msg-type <type>", "Message type: cs | transaction | promotion", "cs")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, elementsJson, opts) => {
            try {
                const elements = JSON.parse(elementsJson);
                const result = await sendList(userId, elements, opts.msgType, opts.oaId);
                output(result, json(), () => success("List message sent"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("status <message-id>")
        .description("Check message delivery status")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (messageId, opts) => {
            try {
                const result = await getMessageStatus(messageId, opts.oaId);
                output(result, json(), () => {
                    const d = result.data || result;
                    info(`Status: ${d.status || JSON.stringify(d)}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Followers ───────────────────────────────────────────────────

    const follower = oa.command("follower").description("Manage OA followers");

    follower
        .command("info <user-id>")
        .description("Get follower details")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, opts) => {
            try {
                const result = await getFollowerInfo(userId, opts.oaId);
                output(result, json(), () => {
                    const d = result.data || result;
                    info(`Name: ${d.display_name || d.name || "N/A"}`);
                    if (d.user_id) info(`User ID: ${d.user_id}`);
                    if (d.user_id_by_app) info(`App User ID: ${d.user_id_by_app}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    follower
        .command("list")
        .description("List OA followers (paginated)")
        .option("--offset <n>", "Offset", "0")
        .option("--count <n>", "Count per page", "50")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const result = await getFollowers(Number(opts.offset), Number(opts.count), opts.oaId);
                output(result, json(), () => {
                    const d = result.data || result;
                    const users = d.users || d.followers || [];
                    info(`Followers: ${d.total || users.length}`);
                    users.forEach((u) => console.log(`  - ${u.user_id}: ${u.display_name || "N/A"}`));
                });
            } catch (e) {
                error(e.message);
            }
        });

    follower
        .command("update <user-id> <updates-json>")
        .description('Update follower info. updates-json: \'{"name":"...","phone":"..."}\'')
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, updatesJson, opts) => {
            try {
                const updates = JSON.parse(updatesJson);
                const result = await updateFollowerInfo(userId, updates, opts.oaId);
                output(result, json(), () => success("Follower info updated"));
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Tags ────────────────────────────────────────────────────────

    const tag = oa.command("tag").description("Manage OA tags");

    tag.command("list")
        .description("List all tags")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const result = await getTags(opts.oaId);
                output(result, json(), () => {
                    const tags = result.data?.tags || result.tags || [];
                    info(`Tags (${tags.length}):`);
                    tags.forEach((t) => console.log(`  - ${t.name} (${t.count || 0} followers)`));
                });
            } catch (e) {
                error(e.message);
            }
        });

    tag.command("assign <user-id> <tag-name>")
        .description("Assign tag to a follower")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, tagName, opts) => {
            try {
                const result = await assignTag(userId, tagName, opts.oaId);
                output(result, json(), () => success(`Tag "${tagName}" assigned`));
            } catch (e) {
                error(e.message);
            }
        });

    tag.command("remove <tag-name>")
        .description("Delete a tag")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (tagName, opts) => {
            try {
                const result = await removeTag(tagName, opts.oaId);
                output(result, json(), () => success(`Tag "${tagName}" removed`));
            } catch (e) {
                error(e.message);
            }
        });

    tag.command("untag <user-id> <tag-name>")
        .description("Remove follower from a tag")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, tagName, opts) => {
            try {
                const result = await removeFollowerFromTag(userId, tagName, opts.oaId);
                output(result, json(), () => success(`Removed "${tagName}" from user`));
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Media Upload ────────────────────────────────────────────────

    const upload = oa.command("upload").description("Upload media to OA");

    upload
        .command("image <file-path>")
        .description("Upload image (returns attachment_id for sending)")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (filePath, opts) => {
            try {
                const result = await uploadImage(resolve(filePath), opts.oaId);
                output(result, json(), () => {
                    const id = extractAttachmentId(result);
                    if (!id) return error(`Upload returned no attachment_id: ${JSON.stringify(result)}`);
                    success(`Image uploaded: ${id}`);
                    info(`Send it with: zalo-agent oa msg image <user-id> --image-id ${id}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    upload
        .command("file <file-path>")
        .description("Upload file (returns token for sending)")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (filePath, opts) => {
            try {
                const result = await uploadFile(resolve(filePath), opts.oaId);
                output(result, json(), () => {
                    const fileToken = extractUploadToken(result);
                    if (!fileToken) return error(`Upload returned no file token: ${JSON.stringify(result)}`);
                    success(`File uploaded: ${fileToken}`);
                    info(`Send it with: zalo-agent oa msg file <user-id> ${fileToken}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Conversations ───────────────────────────────────────────────

    const conv = oa.command("conv").description("OA conversations");

    conv.command("recent")
        .description("List recent conversations")
        .option("--offset <n>", "Offset", "0")
        .option("--count <n>", "Count", "10")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const result = await getRecentChat(Number(opts.offset), Number(opts.count), opts.oaId);
                output(result, json(), () => {
                    const chats = result.data || [];
                    info(`Recent conversations: ${Array.isArray(chats) ? chats.length : "see JSON"}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    conv.command("history <user-id>")
        .description("Get conversation history with a follower")
        .option("--offset <n>", "Offset", "0")
        .option("--count <n>", "Count", "10")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (userId, opts) => {
            try {
                const result = await getConversation(userId, Number(opts.offset), Number(opts.count), opts.oaId);
                output(result, json(), () => {
                    const msgs = result.data || [];
                    info(`Messages: ${Array.isArray(msgs) ? msgs.length : "see JSON"}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Menu ────────────────────────────────────────────────────────

    oa.command("menu <menu-json>")
        .description("Update OA menu. menu-json: '{\"buttons\":[...]}'")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (menuJson, opts) => {
            try {
                const menuData = JSON.parse(menuJson);
                const result = await updateMenu(menuData, opts.oaId);
                output(result, json(), () => success("OA menu updated"));
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Articles ────────────────────────────────────────────────────

    const article = oa.command("article").description("Manage OA articles/broadcasts");

    article
        .command("create <article-json>")
        .description("Create article (broadcast)")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (articleJson, opts) => {
            try {
                const data = JSON.parse(articleJson);
                const result = await createArticle(data, opts.oaId);
                output(result, json(), () => success("Article created"));
            } catch (e) {
                error(e.message);
            }
        });

    article
        .command("list")
        .description("List articles")
        .option("--offset <n>", "Offset", "0")
        .option("--limit <n>", "Limit", "10")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const result = await getArticleList(Number(opts.offset), Number(opts.limit), opts.oaId);
                output(result, json(), () => {
                    const articles = result.data?.articles || [];
                    info(`Articles: ${articles.length}`);
                    articles.forEach((a) => console.log(`  - ${a.id}: ${a.title || "N/A"}`));
                });
            } catch (e) {
                error(e.message);
            }
        });

    article
        .command("detail <article-id>")
        .description("Get article details")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (articleId, opts) => {
            try {
                const result = await getArticleDetail(articleId, opts.oaId);
                output(result, json(), () => {
                    const d = result.data || result;
                    info(`Title: ${d.title || "N/A"}`);
                    if (d.status) info(`Status: ${d.status}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Store ───────────────────────────────────────────────────────

    const store = oa.command("store").description("Manage OA store (products, categories, orders)");

    store
        .command("product-create <product-json>")
        .description("Create product in OA store")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (productJson, opts) => {
            try {
                const data = JSON.parse(productJson);
                const result = await createProduct(data, opts.oaId);
                output(result, json(), () => success("Product created"));
            } catch (e) {
                error(e.message);
            }
        });

    store
        .command("product-list")
        .description("List products")
        .option("--offset <n>", "Offset", "0")
        .option("--limit <n>", "Limit", "10")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const result = await getProductList(Number(opts.offset), Number(opts.limit), opts.oaId);
                output(result, json(), () => {
                    const products = result.data?.products || [];
                    info(`Products: ${products.length}`);
                    products.forEach((p) => console.log(`  - ${p.id}: ${p.name || "N/A"}`));
                });
            } catch (e) {
                error(e.message);
            }
        });

    store
        .command("product-info <product-id>")
        .description("Get product details")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (productId, opts) => {
            try {
                const result = await getProductInfo(productId, opts.oaId);
                output(result, json(), () => {
                    const d = result.data || result;
                    info(`Product: ${d.name || "N/A"} — ${d.price || "N/A"}`);
                });
            } catch (e) {
                error(e.message);
            }
        });

    store
        .command("category-create <category-json>")
        .description("Create store category")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (categoryJson, opts) => {
            try {
                const data = JSON.parse(categoryJson);
                const result = await createCategory(data, opts.oaId);
                output(result, json(), () => success("Category created"));
            } catch (e) {
                error(e.message);
            }
        });

    store
        .command("category-list")
        .description("List store categories")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (opts) => {
            try {
                const result = await getCategoryList(opts.oaId);
                output(result, json(), () => {
                    const cats = result.data?.categories || [];
                    info(`Categories: ${cats.length}`);
                    cats.forEach((c) => console.log(`  - ${c.id}: ${c.name || "N/A"}`));
                });
            } catch (e) {
                error(e.message);
            }
        });

    store
        .command("order-create <order-json>")
        .description("Create order")
        .option("--oa-id <id>", "OA identifier", "default")
        .action(async (orderJson, opts) => {
            try {
                const data = JSON.parse(orderJson);
                const result = await createOrder(data, opts.oaId);
                output(result, json(), () => success("Order created"));
            } catch (e) {
                error(e.message);
            }
        });

    // ─── Webhook Listener ────────────────────────────────────────────

    registerOAListenCommand(oa, program);

    // ─── Guided Setup ────────────────────────────────────────────────

    registerOAInitCommand(oa, program);
}
