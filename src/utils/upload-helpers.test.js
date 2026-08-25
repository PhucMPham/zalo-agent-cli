import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mimeTypeFor, formatBytes, buildUploadForm, MAX_FILE_BYTES } from "./upload-helpers.js";

describe("mimeTypeFor", () => {
    it("maps common image extensions", () => {
        assert.equal(mimeTypeFor("photo.jpg"), "image/jpeg");
        assert.equal(mimeTypeFor("photo.PNG"), "image/png");
        assert.equal(mimeTypeFor("anim.gif"), "image/gif");
    });

    it("maps document extensions", () => {
        assert.equal(mimeTypeFor("report.pdf"), "application/pdf");
        assert.equal(mimeTypeFor("sheet.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        assert.equal(mimeTypeFor("data.csv"), "text/csv");
    });

    it("falls back to octet-stream for unknown or missing extensions", () => {
        assert.equal(mimeTypeFor("binary.xyz"), "application/octet-stream");
        assert.equal(mimeTypeFor("noext"), "application/octet-stream");
        assert.equal(mimeTypeFor(""), "application/octet-stream");
    });
});

describe("formatBytes", () => {
    it("formats bytes, KB and MB", () => {
        assert.equal(formatBytes(512), "512 B");
        assert.equal(formatBytes(2048), "2.0 KB");
        assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
    });
});

describe("buildUploadForm", () => {
    let dir;

    before(() => {
        dir = fs.mkdtempSync(join(tmpdir(), "zalo-upload-"));
    });

    after(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("builds a multipart form with the file basename and MIME type", async () => {
        const filePath = join(dir, "report.pdf");
        fs.writeFileSync(filePath, "%PDF-1.4 test");

        const form = buildUploadForm(filePath, { maxBytes: MAX_FILE_BYTES });
        const part = form.get("file");

        assert.equal(part.name, "report.pdf");
        assert.equal(part.type, "application/pdf");
        assert.equal(await part.text(), "%PDF-1.4 test");
    });

    it("throws a clear error when the file is missing", () => {
        assert.throws(() => buildUploadForm(join(dir, "nope.pdf"), { maxBytes: MAX_FILE_BYTES }), /File not found/);
    });

    it("throws when the path is a directory", () => {
        assert.throws(() => buildUploadForm(dir, { maxBytes: MAX_FILE_BYTES }), /Not a file/);
    });

    it("throws when the file is empty", () => {
        const filePath = join(dir, "empty.txt");
        fs.writeFileSync(filePath, "");
        assert.throws(() => buildUploadForm(filePath, { maxBytes: MAX_FILE_BYTES }), /File is empty/);
    });

    it("throws when the file exceeds the size cap", () => {
        const filePath = join(dir, "big.txt");
        fs.writeFileSync(filePath, "x".repeat(2048));
        assert.throws(
            () => buildUploadForm(filePath, { maxBytes: 1024, label: "Image" }),
            /Image too large: 2.0 KB \(Zalo OA limit is 1.0 KB\)/,
        );
    });
});
