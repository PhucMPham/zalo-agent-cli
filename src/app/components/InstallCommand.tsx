import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { INSTALL_COMMAND } from "../links";

export default function InstallCommand() {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(INSTALL_COMMAND);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard is unavailable (insecure context / denied) — the command stays selectable.
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            className="inline-flex max-w-full items-center gap-3 rounded-full border border-neutral-200 bg-white py-2 pr-3 pl-4 shadow-sm sm:py-2.5"
            aria-label={copied ? "Đã copy" : `Copy: ${INSTALL_COMMAND}`}
        >
            <span className="truncate font-mono text-neutral-800" style={{ fontSize: 13 }}>
                <span className="text-neutral-400">$ </span>
                {INSTALL_COMMAND}
            </span>
            {copied ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
                <Copy className="h-4 w-4 shrink-0 text-neutral-400" />
            )}
        </button>
    );
}
