/**
 * Message commands — send text, images, files, cards, bank cards, QR transfers,
 * stickers, reactions, delete, forward.
 */

import { resolve } from "path";
import { getApi } from "../core/zalo-client.js";
import { success, error, info, output } from "../utils/output.js";

export function registerMsgCommands(program) {
    const msg = program.command("msg").description("Send and manage messages");

    msg.command("send <threadId> <message>")
        .description("Send a text message")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option(
            "--mention <specs...>",
            "Mention users in group message. Format: pos:userId:len (e.g. 0:USER_ID:5). Use userId=-1 for @All.",
        )
        .option(
            "--react <icon>",
            "Auto-react to sent message. Codes: :> (haha), /-heart (heart), /-strong (like), :o (wow), :-(( (cry), :-h (angry)",
        )
        .action(async (threadId, message, opts) => {
            try {
                // Parse mention specs: "pos:uid:len" → { pos, uid, len }
                const mentions = (opts.mention || []).map((spec) => {
                    const [pos, uid, len] = spec.split(":");
                    return { pos: Number(pos), uid, len: Number(len) };
                });

                // Build message content object if mentions exist
                const msgContent = mentions.length > 0 ? { msg: message, mentions } : message;

                const cliMsgId = String(Date.now());
                const result = await getApi().sendMessage(msgContent, threadId, Number(opts.type));
                result.cliMsgId = cliMsgId;
                output(result, program.opts().json, () => success("Message sent"));

                // Auto-react if --react flag provided
                if (opts.react && result.message?.msgId) {
                    const dest = {
                        data: { msgId: String(result.message.msgId), cliMsgId },
                        threadId,
                        type: Number(opts.type),
                    };
                    await getApi().addReaction(opts.react, dest);
                    success(`Auto-reacted with '${opts.react}'`);
                }
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-image <threadId> <paths...>")
        .description("Send one or more images")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-m, --caption <text>", "Caption text", "")
        .action(async (threadId, paths, opts) => {
            try {
                const absPaths = paths.map((p) => resolve(p));
                const result = await getApi().sendMessage(
                    { msg: opts.caption, attachments: absPaths },
                    threadId,
                    Number(opts.type),
                );
                output(result, program.opts().json, () => success(`Image(s) sent to ${threadId}`));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-file <threadId> <paths...>")
        .description("Send files (docx, pdf, zip, etc.)")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-m, --caption <text>", "Caption text", "")
        .action(async (threadId, paths, opts) => {
            try {
                const absPaths = paths.map((p) => resolve(p));
                const result = await getApi().sendMessage(
                    { msg: opts.caption, attachments: absPaths },
                    threadId,
                    Number(opts.type),
                );
                output(result, program.opts().json, () => success(`File(s) sent to ${threadId}`));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-card <threadId> <userId>")
        .description("Send a contact card (danh thiếp)")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("--phone <num>", "Phone number (auto-fetched if omitted)")
        .action(async (threadId, userId, opts) => {
            try {
                const api = getApi();
                let phone = opts.phone;
                if (!phone) {
                    const userInfo = await api.getUserInfo(userId);
                    const profiles = userInfo?.changed_profiles || {};
                    phone = profiles[userId]?.phoneNumber || "";
                    if (phone) info(`Auto-detected phone: ${phone}`);
                }
                const cardOpts = { userId };
                if (phone) cardOpts.phoneNumber = phone;
                const result = await api.sendCard(cardOpts, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Card sent"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-bank <threadId> <accountNumber>")
        .description("Send a bank card (số tài khoản)")
        .requiredOption("-b, --bank <name>", "Bank name (ocb, vcb, bidv) or BIN code")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-n, --name <holder>", "Account holder name")
        .action(async (threadId, accountNumber, opts) => {
            try {
                const { resolveBankBin, BIN_TO_DISPLAY } = await import("../utils/bank-helpers.js");
                const bin = resolveBankBin(opts.bank);
                if (!bin) {
                    error(`Unknown bank: '${opts.bank}'`);
                    return;
                }
                info(`Bank: ${BIN_TO_DISPLAY[bin] || bin} (BIN ${bin})`);

                const payload = { binBank: bin, numAccBank: accountNumber };
                if (opts.name) payload.nameAccBank = opts.name;
                const result = await getApi().sendBankCard(payload, threadId, Number(opts.type));
                output(result, program.opts().json, () =>
                    success(`Bank card sent: ${BIN_TO_DISPLAY[bin]} / ${accountNumber}`),
                );
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-qr-transfer <threadId> <accountNumber>")
        .description("Generate VietQR and send as image")
        .requiredOption("-b, --bank <name>", "Bank name or BIN code")
        .option("-a, --amount <n>", "Transfer amount in VND", parseInt)
        .option("-m, --content <text>", "Transfer content (max 50 chars)")
        .option("--template <tpl>", "QR style: compact, print, qronly", "compact")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (threadId, accountNumber, opts) => {
            try {
                const { resolveBankBin, BIN_TO_DISPLAY, generateQrTransferImage } =
                    await import("../utils/bank-helpers.js");
                const bin = resolveBankBin(opts.bank);
                if (!bin) {
                    error(`Unknown bank: '${opts.bank}'`);
                    return;
                }
                if (opts.content && opts.content.length > 50) {
                    error(`Content too long (${opts.content.length} chars). VietQR max is 50.`);
                    return;
                }
                info(
                    `Generating QR: ${BIN_TO_DISPLAY[bin]} / ${accountNumber}${opts.amount ? ` / ${opts.amount.toLocaleString()}đ` : ""}`,
                );

                const qrPath = await generateQrTransferImage(
                    bin,
                    accountNumber,
                    opts.amount,
                    opts.content,
                    opts.template,
                );
                if (!qrPath) {
                    error("Failed to generate QR image");
                    return;
                }

                const caption = [
                    `QR chuyển khoản ${BIN_TO_DISPLAY[bin]} - ${accountNumber}`,
                    opts.amount ? `${opts.amount.toLocaleString()}đ` : null,
                    opts.content || null,
                ]
                    .filter(Boolean)
                    .join(" - ");

                const result = await getApi().sendMessage(
                    { msg: caption, attachments: [qrPath] },
                    threadId,
                    Number(opts.type),
                );

                // Cleanup temp file
                try {
                    (await import("fs")).unlinkSync(qrPath);
                } catch {}

                output(result, program.opts().json, () => success(`QR transfer sent to ${threadId}`));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("sticker <threadId> <keyword>")
        .description("Search and send a sticker")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (threadId, keyword, opts) => {
            try {
                const api = getApi();
                const search = await api.searchSticker(keyword);
                const stickerId = search?.[0]?.stickerId || "";
                if (!stickerId) {
                    error("No sticker found");
                    return;
                }
                const result = await api.sendSticker(stickerId, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Sticker sent"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("send-video <threadId> <videoUrl>")
        .description("Send a video from URL")
        .requiredOption("--thumb <url>", "Thumbnail image URL")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-m, --caption <text>", "Caption text", "")
        .option("-d, --duration <ms>", "Video duration in milliseconds", parseInt)
        .option("-W, --width <px>", "Video width", parseInt, 1280)
        .option("-H, --height <px>", "Video height", parseInt, 720)
        .action(async (threadId, videoUrl, opts) => {
            try {
                info(`Sending video: ${videoUrl}`);
                const result = await getApi().sendVideo(
                    {
                        videoUrl,
                        thumbnailUrl: opts.thumb,
                        msg: opts.caption,
                        duration: opts.duration,
                        width: opts.width,
                        height: opts.height,
                    },
                    threadId,
                    Number(opts.type),
                );
                output(result, program.opts().json, () => success(`Video sent to ${threadId}`));
            } catch (e) {
                error(`Send video failed: ${e.message}`);
            }
        });

    msg.command("react <msgId> <threadId> <reaction>")
        .description(
            "React to a message. Reaction codes: :> (haha), /-heart (heart), /-strong (like), :o (wow), :-(( (cry), :-h (angry)",
        )
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-c, --cli-msg-id <id>", "Client message ID (required for reaction to appear, get from listen --json)")
        .action(async (msgId, threadId, reaction, opts) => {
            try {
                // zca-js addReaction(icon, dest) — dest needs msgId + cliMsgId
                const dest = {
                    data: { msgId, cliMsgId: opts.cliMsgId || msgId },
                    threadId,
                    type: Number(opts.type),
                };
                const result = await getApi().addReaction(reaction, dest);
                output(result, program.opts().json, () => success(`Reacted with '${reaction}'`));
            } catch (e) {
                error(`React failed: ${e.message}`);
            }
        });

    msg.command("delete <msgId> <threadId>")
        .description("Delete a message you sent")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (msgId, threadId, opts) => {
            try {
                const result = await getApi().deleteMessage(msgId, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Message deleted"));
            } catch (e) {
                error(e.message);
            }
        });

    msg.command("undo <msgId> <threadId>")
        .description("Recall/undo a message for both sides (like Zalo app recall). Requires cliMsgId.")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .option("-c, --cli-msg-id <id>", "Client message ID (required, get from listen --json or send --json)")
        .action(async (msgId, threadId, opts) => {
            try {
                if (!opts.cliMsgId) {
                    error("cliMsgId is required for undo. Get it from: listen --json or send --json output.");
                    return;
                }
                const payload = { msgId, cliMsgId: opts.cliMsgId };
                const result = await getApi().undo(payload, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Message recalled (undone)"));
            } catch (e) {
                error(`Undo failed: ${e.message}`);
            }
        });

    msg.command("forward <msgId> <threadId>")
        .description("Forward a message to another thread")
        .option("-t, --type <n>", "Thread type: 0=User, 1=Group", "0")
        .action(async (msgId, threadId, opts) => {
            try {
                const result = await getApi().forwardMessage(msgId, threadId, Number(opts.type));
                output(result, program.opts().json, () => success("Message forwarded"));
            } catch (e) {
                error(e.message);
            }
        });
}
