#!/usr/bin/env node

/**
 * zalo-agent-cli — CLI for Zalo automation with multi-account + proxy support.
 * Entry point: registers all command groups via Commander.js.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { registerLoginCommands } from "./commands/login.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
import { registerMsgCommands } from "./commands/msg.js";
import { registerFriendCommands } from "./commands/friend.js";
import { registerGroupCommands } from "./commands/group.js";
import { registerConvCommands } from "./commands/conv.js";
import { registerAccountCommands } from "./commands/account.js";
import { registerListenCommand } from "./commands/listen.js";
import { autoLogin } from "./core/zalo-client.js";
import { checkForUpdates, selfUpdate } from "./utils/update-check.js";
import { success, error, warning } from "./utils/output.js";

const DISCLAIMER = "This tool uses unofficial Zalo APIs (zca-js) — your account may be banned. Use at your own risk. | Tool này dùng API Zalo không chính thức (zca-js) — account có thể bị ban. Tự chịu trách nhiệm.";

const program = new Command();

program
    .name("zalo-agent")
    .description("CLI tool for Zalo automation — multi-account, proxy, bank transfers, QR payments")
    .version(pkg.version)
    .option("--json", "Output results as JSON (machine-readable)")
    .hook("preAction", async (thisCommand) => {
        // Suppress zca-js internal logs in JSON mode to keep stdout clean for piping
        if (program.opts().json) {
            process.env.ZALO_JSON_MODE = "1";
        } else {
            warning(DISCLAIMER);
            console.log();
        }
        // Auto-login before any command that needs it (skip for login/account commands)
        const cmdName = thisCommand.args?.[0] || thisCommand.name();
        const skipAutoLogin = ["login", "account", "help", "version", "update"].includes(cmdName);
        if (!skipAutoLogin) {
            await autoLogin(program.opts().json);
        }
        // Non-blocking update check (skip for update command itself)
        if (cmdName !== "update") {
            checkForUpdates(pkg.version, program.opts().json);
        }
    });

// Self-update command
program
    .command("update")
    .description("Update zalo-agent-cli to the latest version")
    .action(() => {
        const ok = selfUpdate();
        if (ok) success(`Updated to latest version`);
        else error("Update failed. Try manually: npm install -g zalo-agent-cli@latest");
    });

// Register all command groups
registerLoginCommands(program);
registerMsgCommands(program);
registerFriendCommands(program);
registerGroupCommands(program);
registerConvCommands(program);
registerAccountCommands(program);
registerListenCommand(program);

program.parse();
