/**
 * OA Webhook listener — starts a local HTTP server to receive Zalo OA events.
 * Supports MAC verification, event filtering, and JSON output for piping.
 *
 * Usage:
 *   zalo-agent oa listen --port 3000 --secret <oa-secret-key>
 *   zalo-agent oa listen --events follow,user_send_text
 *
 * Then configure your webhook URL at developers.zalo.me to point to:
 *   https://your-domain:3000/webhook
 */

import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { success, error, info, warning, output } from "../utils/output.js";

/** All supported OA webhook event types. */
const ALL_EVENTS = [
    "follow",
    "unfollow",
    "user_send_text",
    "user_send_image",
    "user_send_file",
    "user_send_location",
    "user_send_sticker",
    "user_send_gif",
    "user_click_button",
    "user_click_link",
];

/**
 * Verify MAC signature from Zalo OA using timing-safe comparison.
 * Zalo signs webhooks as SHA256(app_id + raw_body + timestamp + OA_SECRET_KEY)
 * where app_id/timestamp come from the payload itself and OA_SECRET_KEY is the
 * per-OA key shown on the app's Webhook settings page (NOT the App Secret Key).
 * Verified against live Zalo webhook traffic.
 */
function verifyMac(body, mac, secretKey) {
    let appId, timestamp;
    try {
        ({ app_id: appId, timestamp } = JSON.parse(body));
    } catch {
        return false;
    }
    if (!appId || !timestamp) return false;
    const calculated = createHash("sha256")
        .update(appId + body + timestamp + secretKey)
        .digest("hex");
    if (mac.length !== calculated.length) return false;
    return timingSafeEqual(Buffer.from(mac), Buffer.from(calculated));
}

export function registerOAListenCommand(oaCommand, program) {
    oaCommand
        .command("listen")
        .description("Start webhook listener for OA events (follow, messages, clicks, etc.)")
        .option("-p, --port <port>", "Listen port", "3000")
        .option("-s, --secret <key>", "OA Secret Key for MAC verification (Webhook settings page — NOT the App Secret Key)")
        .option("--no-verify", "Skip MAC verification (not recommended)")
        .option("-e, --events <list>", `Comma-separated event filter: ${ALL_EVENTS.join(",")}`, "all")
        .option("--path <path>", "Webhook URL path", "/webhook")
        .option("--verify-domain <code>", "Zalo domain verification code (serves /zalo_verifier<code>.html)")
        .action(async (opts) => {
            const json = () => program.opts().json;
            const port = Number(opts.port);
            const eventFilter = opts.events === "all" ? null : opts.events.split(",").map((e) => e.trim());

            if (!opts.secret && opts.verify) {
                warning("No --secret provided. MAC verification disabled. Use --secret for security.");
            }

            const server = createServer((req, res) => {
                // GET — webhook verification (hub.challenge)
                if (req.method === "GET" && req.url?.startsWith(opts.path)) {
                    const url = new URL(req.url, `http://localhost:${port}`);
                    const challenge = url.searchParams.get("hub.challenge");
                    if (challenge) {
                        if (!json()) info(`Webhook verified (challenge: ${challenge})`);
                        res.writeHead(200, { "Content-Type": "text/plain" });
                        res.end(challenge);
                        return;
                    }
                }

                // POST — receive events
                if (req.method === "POST" && req.url?.startsWith(opts.path)) {
                    let body = "";
                    let bodySize = 0;
                    const MAX_BODY = 1024 * 1024; // 1MB limit
                    req.on("data", (chunk) => {
                        bodySize += chunk.length;
                        if (bodySize > MAX_BODY) {
                            req.destroy();
                            res.writeHead(413);
                            res.end('{"error":"Payload too large"}');
                            return;
                        }
                        body += chunk;
                    });
                    req.on("end", () => {
                        try {
                            // MAC verification
                            if (opts.verify && opts.secret) {
                                // Zalo sends MAC as "mac=<hex>" in X-Zevent-Signature header or mac header
                                const sigHeader = req.headers["x-zevent-signature"] || req.headers.mac || "";
                                const mac = sigHeader.startsWith("mac=") ? sigHeader.slice(4) : sigHeader;
                                if (!mac || !verifyMac(body, mac, opts.secret)) {
                                    const errData = {
                                        event_type: "error",
                                        error: "Invalid or missing MAC",
                                        timestamp: new Date().toISOString(),
                                    };
                                    output(errData, json(), () => warning("Rejected: invalid MAC"));
                                    res.writeHead(401);
                                    res.end('{"error":"Invalid MAC"}');
                                    return;
                                }
                            }

                            const event = JSON.parse(body);
                            const eventName = event.event_name || event.event_type || "unknown";

                            // Filter events
                            if (eventFilter && !eventFilter.includes(eventName)) {
                                res.writeHead(200);
                                res.end('{"status":"filtered"}');
                                return;
                            }

                            // Enrich with timestamp
                            event._received_at = new Date().toISOString();

                            // Output event
                            output(event, json(), () => {
                                const sender = event.sender?.id || event.user_id || "N/A";
                                const msg = event.message?.text || "";
                                switch (eventName) {
                                    case "follow":
                                        success(`[follow] User ${sender} followed OA`);
                                        break;
                                    case "unfollow":
                                        warning(`[unfollow] User ${sender} unfollowed OA`);
                                        break;
                                    case "user_send_text":
                                        info(`[text] ${sender}: ${msg}`);
                                        break;
                                    case "user_send_image":
                                        info(`[image] ${sender} sent an image`);
                                        break;
                                    case "user_send_file":
                                        info(`[file] ${sender} sent a file`);
                                        break;
                                    case "user_send_location":
                                        info(`[location] ${sender} sent location`);
                                        break;
                                    case "user_send_sticker":
                                        info(`[sticker] ${sender} sent a sticker`);
                                        break;
                                    case "user_send_gif":
                                        info(`[gif] ${sender} sent a GIF`);
                                        break;
                                    case "user_click_button":
                                        info(`[click] ${sender} clicked a button`);
                                        break;
                                    case "user_click_link":
                                        info(`[link] ${sender} clicked a link`);
                                        break;
                                    default:
                                        info(`[${eventName}] ${JSON.stringify(event).slice(0, 120)}`);
                                }
                            });

                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end('{"status":"ok"}');
                        } catch (e) {
                            error(`Parse error: ${e.message}`);
                            res.writeHead(400);
                            res.end('{"error":"Invalid JSON"}');
                        }
                    });
                    return;
                }

                // Zalo domain verification file
                if (opts.verifyDomain && req.url?.includes("zalo_verifier")) {
                    const html = `<html><head><meta name="zalo-platform-site-verification" content="${opts.verifyDomain}" /></head><body>zalo verification</body></html>`;
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(html);
                    if (!json()) info(`Served domain verification for: ${req.url}`);
                    return;
                }

                // Root page with meta tag (for meta-based verification)
                if (req.url === "/" && opts.verifyDomain) {
                    const html = `<html><head><meta name="zalo-platform-site-verification" content="${opts.verifyDomain}" /></head><body>Zalo OA Webhook</body></html>`;
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(html);
                    return;
                }

                // Health check / other routes
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "ok", webhook: opts.path }));
            });

            server.listen(port, () => {
                if (!json()) {
                    success(`OA webhook listener started on port ${port}`);
                    info(`Webhook URL: http://localhost:${port}${opts.path}`);
                    info(`Events: ${eventFilter ? eventFilter.join(", ") : "all"}`);
                    info(`MAC verify: ${opts.verify && opts.secret ? "enabled" : "disabled"}`);
                    console.log();
                    info("Configure this URL at developers.zalo.me → Webhook settings");
                    info("Press Ctrl+C to stop\n");
                }
            });

            // Graceful shutdown
            const shutdown = () => {
                if (!json()) info("\nShutting down listener...");
                server.close();
                process.exit(0);
            };
            process.on("SIGINT", shutdown);
            process.on("SIGTERM", shutdown);

            // Keep process alive
            await new Promise(() => {});
        });
}
