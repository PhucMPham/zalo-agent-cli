/**
 * Express server wrapping MCP StreamableHTTP transport with bearer token auth.
 * Uses stateless mode — each POST /mcp request creates a fresh server+transport.
 */

import express from "express";
import { timingSafeEqual } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));

/**
 * Create HTTP MCP server with optional bearer token auth.
 * @param {Function} registerToolsFn - Registers tools on a McpServer instance
 * @param {object} deps - { api, buffer, filter, config }
 * @param {number} port
 * @param {string|null} authToken - Bearer token (null = no auth)
 * @returns {import("http").Server}
 */
export function createHTTPServer(registerToolsFn, deps, port, authToken, host = "127.0.0.1") {
    const app = express();
    app.use(express.json());

    // Auth middleware — skips /health
    if (authToken) {
        app.use((req, res, next) => {
            if (req.path === "/health") return next();
            const token = req.headers.authorization?.slice(7) || "";
            const expected = Buffer.from(authToken, "utf8");
            const received = Buffer.from(token, "utf8");
            if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            next();
        });
    }

    // MCP endpoint — stateless, fresh server+transport per request
    app.post("/mcp", async (req, res) => {
        try {
            const server = new McpServer({ name: "zalo-agent", version: pkg.version });
            registerToolsFn(server, deps.api, deps.buffer, deps.filter, deps.config, deps.nameCache, deps.historyStore);

            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined, // stateless mode
            });

            res.on("close", () => {
                transport.close();
                server.close();
            });

            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error("MCP HTTP error:", err);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: "2.0",
                    error: { code: -32603, message: "Internal server error" },
                    id: null,
                });
            }
        }
    });

    // Health check — no auth required
    app.get("/health", (req, res) => {
        res.json({
            status: "ok",
            uptime: Math.floor(process.uptime()),
            threads: deps.buffer.getStats().length,
        });
    });

    return app.listen(port, host, () => {
        console.error(`MCP HTTP server listening on ${host}:${port}`);
    });
}
