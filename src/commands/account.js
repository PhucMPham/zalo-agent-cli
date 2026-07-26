/**
 * Account commands — multi-account management with per-account proxy.
 * Includes export for headless/CI credential transfer.
 */

import { writeFileSync, chmodSync } from "fs";
import { resolve } from "path";
import { loginWithQR, loginWithCredentials, extractCredentials, clearSession } from "../core/zalo-client.js";
import { saveCredentials, loadCredentials } from "../core/credentials.js";
import { listAccounts, getActive, setActive, addAccount, removeAccount, getAccount } from "../core/accounts.js";
import { maskProxy } from "../utils/proxy-helpers.js";
import { displayQR, getQRPath } from "../utils/qr-display.js";
import { startQrServer } from "../utils/qr-http-server.js";
import { success, error, info, warning, output } from "../utils/output.js";

export function registerAccountCommands(program) {
    const account = program.command("account").description("Manage multiple Zalo accounts with proxy");

    account
        .command("list")
        .description("List all registered accounts")
        .action(() => {
            const accounts = listAccounts();
            const safe = accounts.map((a) => ({ ...a, proxy: maskProxy(a.proxy) }));
            output(safe, program.opts().json, () => {
                if (!accounts.length) {
                    // Empty state is command output (data), not a status message → stdout.
                    console.log("  No accounts. Use: zalo-agent account login");
                    return;
                }
                console.log(`  ${"Active".padEnd(8)} ${"Owner ID".padEnd(22)} ${"Name".padEnd(20)} Proxy`);
                console.log(`  ${"─".repeat(75)}`);
                for (const a of accounts) {
                    const marker = a.active ? "  ★" : "   ";
                    console.log(
                        `  ${marker.padEnd(8)} ${a.ownId.padEnd(22)} ${(a.name || "").padEnd(20)} ${maskProxy(a.proxy)}`,
                    );
                }
            });
        });

    account
        .command("login")
        .description("Login a new Zalo account via QR code")
        .option("-p, --proxy <url>", "Dedicated proxy URL for this account")
        .option("-n, --name <label>", "Friendly label", "")
        .option("--qr-url", "Start local HTTP server to view QR in browser (for VPS/headless)")
        .action(async (opts) => {
            if (opts.proxy) info(`Using proxy: ${maskProxy(opts.proxy)}`);
            info("Generating QR code... Scan with Zalo mobile app.");

            let qrServer = null;
            try {
                const { ownId } = await loginWithQR(opts.proxy, (event) => {
                    displayQR(event);
                    if (!qrServer) {
                        qrServer = startQrServer(getQRPath());
                    }
                });

                // Fetch display name from Zalo profile
                let displayName = opts.name || "";
                try {
                    const { getApi } = await import("../core/zalo-client.js");
                    const accountInfo = await getApi().fetchAccountInfo();
                    displayName = accountInfo?.profile?.displayName || displayName || ownId;
                } catch {}

                const creds = extractCredentials();
                saveCredentials(ownId, creds);
                addAccount(ownId, displayName, opts.proxy);
                success(
                    `Account logged in: ${displayName} (${ownId})${opts.proxy ? ` via ${maskProxy(opts.proxy)}` : ""}`,
                );
            } catch (e) {
                error(`Login failed: ${e.message}`);
            } finally {
                if (qrServer) qrServer.close();
            }
        });

    account
        .command("switch <ownerId>")
        .description("Switch active account (restarts connection with account proxy)")
        .action(async (ownerId) => {
            let acc = getAccount(ownerId);
            if (!acc) {
                const all = listAccounts();
                const matches = all.filter((a) => a.ownId.includes(ownerId) || (a.name || "").includes(ownerId));
                if (matches.length === 1) {
                    ownerId = matches[0].ownId;
                    acc = matches[0];
                } else {
                    error(`Account not found: ${ownerId}`);
                    return;
                }
            }

            const creds = loadCredentials(ownerId);
            if (!creds) {
                error(`No credentials for ${ownerId}. Re-login needed.`);
                return;
            }

            info(`Switching to ${ownerId} (${acc?.name || ""})`);
            if (acc?.proxy) info(`Proxy: ${maskProxy(acc.proxy)}`);

            clearSession();
            try {
                await loginWithCredentials(creds, acc?.proxy || null);
                setActive(ownerId);
                success(`Switched to ${ownerId}`);
            } catch (e) {
                error(`Switch failed: ${e.message}`);
            }
        });

    account
        .command("remove <ownerId>")
        .description("Remove account and delete its credentials")
        .action((ownerId) => {
            if (removeAccount(ownerId)) {
                success(`Account ${ownerId} removed`);
            } else {
                error(`Account not found: ${ownerId}`);
            }
        });

    account
        .command("info")
        .description("Show currently active account")
        .action(() => {
            const active = getActive();
            const safe = active ? { ...active, proxy: maskProxy(active.proxy) } : null;
            output(safe, program.opts().json, () => {
                if (!active) {
                    info("No active account.");
                    return;
                }
                console.log(`  Owner ID: ${active.ownId}`);
                console.log(`  Name:     ${active.name || "-"}`);
                console.log(`  Proxy:    ${maskProxy(active.proxy)}`);
                console.log(`  Active:   yes`);
            });
        });

    account
        .command("export [ownerId]")
        .description("Export account credentials for transfer to another machine")
        .option("-o, --output <path>", "Output file path", "./zalo-creds.json")
        .action((ownerId, opts) => {
            const acc = ownerId ? getAccount(ownerId) : getActive();
            if (!acc) {
                error("No account found to export.");
                return;
            }

            const creds = loadCredentials(acc.ownId);
            if (!creds) {
                error(`No credentials for ${acc.ownId}.`);
                return;
            }

            const exportData = {
                ...creds,
                proxy: acc.proxy || null,
                ownId: acc.ownId,
                name: acc.name || "",
            };

            const outPath = resolve(opts.output);
            writeFileSync(outPath, JSON.stringify(exportData, null, 2), "utf-8");
            chmodSync(outPath, 0o600);

            success(`Exported to ${outPath}`);
            warning("This file contains login credentials. Keep it secure and do not commit to git.");
            info(`Import on another machine: zalo-agent login --credentials ${opts.output}`);
        });
}
