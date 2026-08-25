# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **OA file/image upload was hitting a non-existent endpoint** — `oa upload file` and `oa upload image` posted to `v3.0/oa/upload/*`, which Zalo does not publish; uploads now go to the documented `v2.0/oa/upload/*` endpoints. This is what made attaching a file to an OA message fail.
- **Multipart part had no MIME type** — the uploaded blob is now typed from the file extension instead of always defaulting to `application/octet-stream`.
- **Windows paths broke the multipart filename** — `filePath.split("/").pop()` sent the full path as the filename on Windows; replaced with `basename()`.
- **Opaque errors on upload failures** — missing file, directory path, empty file, and oversize file are now rejected up front with actionable messages (Zalo caps: 1 MB image, 5 MB file), and non-JSON API responses report the HTTP status and body instead of a JSON parse error.
- `oa msg file` with an empty token now explains what to do instead of sending an invalid request.
- **Send failure no longer discards a successful upload** — when `uploadAndSendFile` uploads a file but delivery fails (wrong user id, expired CS window, rate limit), the error now carries the `fileToken` and the CLI prints a ready-to-run retry command, instead of forcing a re-upload of up to 5 MB.

### Added

- `oa msg file <user-id> --file <path>` — uploads a local file and sends it in one step, so the file token no longer has to be copied by hand.
- `uploadAndSendFile()`, `extractUploadToken()`, and `extractAttachmentId()` helpers in the OA client.
- `src/utils/upload-helpers.js` with MIME detection and multipart form building, plus 9 unit tests.
- `src/core/oa-client.test.js` — 18 regression tests pinning the v2.0/v3.0 endpoint split (uploads on v2.0, messaging on v3.0), multipart filename/MIME, size caps, and error surfacing. Verified to fail if the upload endpoint is reverted to v3.0 (total: 172).
- `setHttpClient()` test seam on the OA client for injecting a stub HTTP client.

### Changed

- `oa upload image` / `oa upload file` print the follow-up command to send the uploaded media.

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
