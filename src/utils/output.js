/**
 * Output formatting utilities — JSON mode and colored human-readable output.
 */

import chalk from "chalk";

/** Emit JSON or call human formatter based on --json flag. */
export function output(data, jsonMode, humanFormatter) {
    if (jsonMode) {
        console.log(JSON.stringify(data, null, 2));
    } else if (humanFormatter) {
        humanFormatter(data);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

export const success = (msg) => console.error(chalk.green("  ✓ " + msg));
export const error = (msg) => console.error(chalk.red("  ✗ " + msg));
export const info = (msg) => console.error(chalk.cyan("  ● " + msg));
export const warning = (msg) => console.error(chalk.yellow("  ⚠ " + msg));
