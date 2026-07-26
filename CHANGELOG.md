# Changelog

All notable changes to this project will be documented in this file.

## [1.7.0] - 2026-07-26

### Added

- **`msg history` command** — read a DM's or group's recent message history from the Zalo server (`zalo-agent msg history <id> -t 1 -n 50`).
- **MCP `zalo_get_history`** — server-backed conversation history, seeded from Zalo's backfill at each (re)connect and growing with live messages. Supports `senderId` and `since`/`until` (date-range) filters; every message includes `replyTo` (who/what it replies to) and `mentions`.
- **MCP `zalo_search_history`** — search captured history across all threads (or one) by sender and/or date range: "all messages from person X", "everything between two dates".
- **MCP setup docs** for both Claude Code and Claude Desktop in the README (including the nvm/PATH gotcha and the one-session-per-account caveat), plus full skill docs for all 8 MCP tools.

### Fixed

- **`zalo_get_history` returned empty over the persistent MCP server** — Zalo only replays old messages during a connection's initial sync window, so the on-demand `requestOldMessages` call timed out. History is now captured into a store at connect time and served from there.
- **Reconnect eviction loop** — when a second Zalo web session evicts this one (a plain code-1000 close, not the 3000 duplicate frame), the listener now backs off exponentially (5s → 5 min) instead of re-logging in every 5s, with a one-time multi-session warning.
- **Backfill dropped on reconnect** — a reconnect mid-backfill no longer skips the new connection's sync window (generation-based supersede).
- **stdio MCP transport corruption** — status output routed to stderr; `account list`'s empty-state now prints to stdout (data channel).

### Changed

- Message normalizers extracted into a testable `message-normalize.js` module; broader unit-test coverage for the history store, reconnect backoff, time parsing, and the zca-js field mappings.

## [1.6.1] - 2026-03-27

### Security

- **HTTP MCP binds to `127.0.0.1` by default** — prevents accidental network exposure of Zalo sessions. Use `--host 0.0.0.0` to override.
- **Command injection fix** — replaced `exec()` with `execFile()` in media file opener, preventing shell injection via crafted filenames.
- **Timing-safe token comparison** — bearer token auth now uses `crypto.timingSafeEqual` instead of `===`, resistant to timing attacks.
- **Empty `--auth` validation** — `--auth ""` no longer silently disables authentication middleware.

### Added

- `--host <address>` flag for MCP HTTP transport to control bind address.
- `prepublishOnly` script — blocks `npm publish` if lint or tests fail.
- `npm test` step in CI workflow — tests now run on every push/PR.
- `getThreadType()` public method on `MessageBuffer` (replaces private `_threads` access).
- Port validation for `--http` flag (rejects non-integer or out-of-range values).
- Unit tests for `getThreadType()` (4 new tests, total: 145).

### Fixed

- Webhook fetch timeout — added `AbortSignal.timeout(5000)` to prevent connection leaks on slow webhook servers.
- Silent `catch {}` blocks in listen command replaced with `console.error` for debuggability.
- Graceful shutdown in MCP mode — SIGINT now stops Zalo listener, flushes notifier, and closes HTTP server.
- Windows compatibility — `openFile()` now handles `start` (cmd.exe builtin) correctly with `shell: true`.

### Changed

- MCP server version now reads from `package.json` instead of hardcoded `"1.0.0"` (both stdio and HTTP transports).
- `mcp-tools.js` uses `buffer.getThreadType()` public API instead of accessing `buffer._threads` directly.

## [1.6.0] - 2026-03-26

### Added

- MCP server for AI agent integration (stdio + HTTP transports)
- Unified media downloader with auto-download and organized folder structure
- Thread name cache with Vietnamese accent-insensitive search
- Notifier system for offline agent alerts
- Thread filter with glob pattern matching

## [1.5.1] - 2026-03-25

### Fixed

- Minor bug fixes and stability improvements
