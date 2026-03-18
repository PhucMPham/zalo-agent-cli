/**
 * Login commands — QR login, credential login, logout, status, whoami.
 */

import { readFileSync, unlinkSync } from "fs";
import {
    loginWithQR,
    loginWithCredentials,
    extractCredentials,
    clearSession,
    isLoggedIn,
    getApi,
    getOwnId,
} from "../core/zalo-client.js";
import { saveCredentials, deleteCredentials } from "../core/credentials.js";
import { addAccount, getActive, removeAccount } from "../core/accounts.js";
import { maskProxy } from "../utils/proxy-helpers.js";
import { displayQR, getQRPath } from "../utils/qr-display.js";
import { startQrServer } from "../utils/qr-http-server.js";
import { success, error, info, output } from "../utils/output.js";

export function registerLoginCommands(program) {
    program
        .command("login")
        .description("Login to Zalo via QR code scan or from exported credentials")
        .option("-p, --proxy <url>", "Proxy URL (http/https/socks5://[user:pass@]host:port)")
        .option("-n, --name <label>", "Friendly name for this account", "")
        .option("--qr-url", "Start local HTTP server to view QR in browser (for VPS/headless)")
        .option("-q, --qr-port <port>", "Port for QR HTTP server (default: 18927)", parseInt)
        .option("--credentials <path>", "Login from exported credentials file (skip QR)")
        .action(async (opts) => {
            // Credential-based login (headless/CI)
            if (opts.credentials) {
                try {
                    const raw = JSON.parse(readFileSync(opts.credentials, "utf-8"));
                    const proxy = opts.proxy || raw.proxy || null;
                    if (proxy) info(`Using proxy: ${maskProxy(proxy)}`);

                    const { ownId } = await loginWithCredentials(raw, proxy);

                    let displayName = opts.name || raw.name || "";
                    try {
                        const accountInfo = await getApi().fetchAccountInfo();
                        displayName = accountInfo?.profile?.displayName || displayName || ownId;
                    } catch {}

                    const creds = extractCredentials();
                    saveCredentials(ownId, creds);
                    addAccount(ownId, displayName, proxy);
                    success(`Logged in as ${displayName} (${ownId})`);
                } catch (e) {
                    error(`Login from credentials failed: ${e.message}`);
                    process.exit(1);
                }
                return;
            }

            // QR-based login
            const jsonMode = program.opts().json;
            if (opts.proxy) info(`Using proxy: ${maskProxy(opts.proxy)}`);
            if (!jsonMode) info("Generating QR code... Scan with Zalo mobile app.");

            let qrServer = null;
            try {
                const { ownId } = await loginWithQR(opts.proxy, (event) => {
                    displayQR(event);

                    // Always start HTTP server for QR scanning (no flag needed)
                    if (!qrServer) {
                        qrServer = startQrServer(getQRPath(), opts.qrPort || 18927);
                    }
                });

                // Fetch display name from Zalo profile
                let displayName = opts.name || "";
                try {
                    const accountInfo = await getApi().fetchAccountInfo();
                    displayName = accountInfo?.profile?.displayName || displayName || ownId;
                } catch {}

                const creds = extractCredentials();
                saveCredentials(ownId, creds);
                addAccount(ownId, displayName, opts.proxy);

                if (jsonMode) {
                    console.log(JSON.stringify({ event: "login_success", ownId, name: displayName }));
                } else {
                    success(`Logged in as ${displayName} (${ownId})`);
                }
            } catch (e) {
                if (jsonMode) {
                    console.log(JSON.stringify({ event: "login_error", message: e.message }));
                } else {
                    error(`Login failed: ${e.message}`);
                }
                process.exit(1);
            } finally {
                if (qrServer) qrServer.close();
            }
        });

    program
        .command("logout")
        .description("Logout current account (keeps credentials for auto-login)")
        .option("--purge", "Also delete saved credentials (must QR login again)")
        .action((opts) => {
            const active = getActive();
            clearSession();

            if (opts.purge && active) {
                deleteCredentials(active.ownId);
                removeAccount(active.ownId);
                // Also remove QR image
                try {
                    unlinkSync(getQRPath());
                } catch {}
                success(`Logged out and purged credentials for ${active.name || active.ownId}`);
            } else {
                success("Logged out (credentials kept — will auto-login on next command)");
                if (active) info(`To fully remove: zalo-agent account remove ${active.ownId}`);
            }
        });

    program
        .command("status")
        .description("Show current login status")
        .action(() => {
            const active = getActive();
            const data = {
                loggedIn: isLoggedIn(),
                ownId: getOwnId(),
                activeAccount: active
                    ? { ownId: active.ownId, name: active.name, proxy: maskProxy(active.proxy) }
                    : null,
            };
            output(data, program.opts().json, () => {
                if (data.loggedIn) {
                    success(`Logged in as ${data.ownId}`);
                    if (active) info(`Account: ${active.name || active.ownId} | Proxy: ${maskProxy(active.proxy)}`);
                } else {
                    info("Not logged in");
                    if (active)
                        info(`Active account: ${active.name || active.ownId} (will auto-login on next command)`);
                }
            });
        });

    program
        .command("whoami")
        .description("Show current user profile")
        .action(async () => {
            try {
                const api = getApi();
                const accountInfo = await api.fetchAccountInfo();
                output(accountInfo, program.opts().json, () => {
                    const p = accountInfo?.profile || {};
                    info(`Name: ${p.displayName || "?"}`);
                    info(`ID: ${p.userId || getOwnId()}`);
                    info(`Phone: ${p.phoneNumber || "?"}`);
                });
            } catch (e) {
                error(e.message);
            }
        });
}
