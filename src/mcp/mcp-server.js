/**
 * MCP server setup with stdio transport.
 * Creates and connects the McpServer instance for Claude Code integration.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./mcp-tools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));

/**
 * Create and start MCP server with stdio transport.
 * All logs MUST use console.error() — stdout is reserved for MCP protocol.
 * @param {object} api - zca-js API instance
 * @param {import("./message-buffer.js").MessageBuffer} buffer
 * @param {import("./thread-filter.js").ThreadFilter} filter
 * @param {object} config - MCP config
 * @param {import("./thread-name-cache.js").ThreadNameCache} [nameCache] - Thread name cache
 * @param {import("./history-store.js").HistoryStore} [historyStore] - Message history store
 * @returns {Promise<McpServer>}
 */
export async function createMCPServer(api, buffer, filter, config, nameCache, historyStore) {
    const server = new McpServer({
        name: "zalo-agent",
        version: pkg.version,
    });

    registerTools(server, api, buffer, filter, config, nameCache, historyStore);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("[mcp-server] MCP server connected via stdio transport");

    return server;
}
