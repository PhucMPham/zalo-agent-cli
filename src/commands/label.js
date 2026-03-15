/**
 * Label commands — list and update conversation/contact labels.
 */

import { getApi } from "../core/zalo-client.js";
import { success, error, output } from "../utils/output.js";

export function registerLabelCommands(program) {
    const label = program.command("label").description("Manage conversation labels");

    label
        .command("list")
        .description("List all labels")
        .action(async () => {
            try {
                const result = await getApi().getLabels();
                output(result, program.opts().json);
            } catch (e) {
                error(`Get labels failed: ${e.message}`);
            }
        });

    label
        .command("update <json>")
        .description('Update labels (JSON payload: {"labelData":[...],"version":N})')
        .action(async (json) => {
            try {
                const payload = JSON.parse(json);
                const result = await getApi().updateLabels(payload);
                output(result, program.opts().json, () => success("Labels updated"));
            } catch (e) {
                if (e instanceof SyntaxError) {
                    error(`Invalid JSON: ${e.message}`);
                } else {
                    error(`Update labels failed: ${e.message}`);
                }
            }
        });
}
