/**
 * Helpers for Zalo OA media uploads — MIME detection and multipart payload building.
 *
 * The OA upload API infers the media kind from the multipart filename and its
 * Content-Type, so both must be set correctly or the API rejects the upload.
 */

import fs from "node:fs";
import { basename, extname } from "node:path";

/** Zalo OA upload size caps. */
export const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TYPES = {
    // images
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    // documents
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".zip": "application/zip",
};

/**
 * Resolve a MIME type from a filename extension.
 *
 * @param {string} filename
 * @returns {string} MIME type, falling back to application/octet-stream
 */
export function mimeTypeFor(filename) {
    return MIME_TYPES[extname(filename || "").toLowerCase()] || "application/octet-stream";
}

/** Format a byte count for error messages. */
export function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Read a local file into a multipart FormData body for the OA upload API.
 * Validates the path and size up front so failures are actionable instead of
 * surfacing as an opaque API error code.
 *
 * @param {string} filePath Absolute or relative path to the file
 * @param {{ maxBytes: number, label?: string }} opts
 * @returns {FormData} form with a single `file` part
 */
export function buildUploadForm(filePath, { maxBytes, label = "File" }) {
    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch {
        throw new Error(`File not found: ${filePath}`);
    }
    if (!stat.isFile()) throw new Error(`Not a file: ${filePath}`);
    if (stat.size === 0) throw new Error(`File is empty: ${filePath}`);
    if (stat.size > maxBytes) {
        throw new Error(
            `${label} too large: ${formatBytes(stat.size)} (Zalo OA limit is ${formatBytes(maxBytes)}) — ${filePath}`,
        );
    }

    const name = basename(filePath);
    const blob = new Blob([fs.readFileSync(filePath)], { type: mimeTypeFor(name) });
    const form = new FormData();
    form.append("file", blob, name);
    return form;
}
