import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Each command is written as parts rather than syntax-highlighted, so the eye
 * lands on the package name: the tool is the accent, the payload is bright,
 * the boilerplate around them stays quiet.
 */
type Part = { text: string; tone: "accent" | "bright" | "dim" };

const TABS: Array<{ id: string; label: string; parts: Part[] }> = [
    {
        id: "npm",
        label: "npm",
        parts: [
            { text: "npm", tone: "accent" },
            { text: "install -g", tone: "dim" },
            { text: "zalo-agent-cli", tone: "bright" },
        ],
    },
    {
        id: "pnpm",
        label: "pnpm",
        parts: [
            { text: "pnpm", tone: "accent" },
            { text: "add -g", tone: "dim" },
            { text: "zalo-agent-cli", tone: "bright" },
        ],
    },
    {
        id: "bun",
        label: "bun",
        parts: [
            { text: "bun", tone: "accent" },
            { text: "add -g", tone: "dim" },
            { text: "zalo-agent-cli", tone: "bright" },
        ],
    },
    {
        id: "npx",
        label: "npx",
        parts: [
            { text: "npx", tone: "accent" },
            { text: "zalo-agent-cli@latest", tone: "bright" },
            { text: "login", tone: "dim" },
        ],
    },
];

const TONE: Record<Part["tone"], string> = {
    accent: "text-brand",
    bright: "text-fg",
    dim: "text-muted",
};

export default function InstallBlock() {
    const [active, setActive] = useState(TABS[0].id);
    const [copied, setCopied] = useState(false);

    const current = TABS.find((tab) => tab.id === active) ?? TABS[0];
    const command = current.parts.map((part) => part.text).join(" ");

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard blocked (insecure context) — the command stays selectable.
        }
    };

    return (
        <div>
            <p className="mb-3 font-mono text-xs tracking-[0.2em] text-muted uppercase">Cài đặt qua terminal</p>

            <div className="overflow-hidden rounded-2xl border border-line bg-code-bg/80 backdrop-blur-sm">
                <div className="flex items-center gap-6 border-b border-line px-5 py-3" role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={tab.id === active}
                            onClick={() => {
                                setActive(tab.id);
                                setCopied(false);
                            }}
                            className={`font-mono text-sm transition-colors ${
                                tab.id === active ? "text-fg" : "text-muted hover:text-fg"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 px-5 py-4">
                    <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
                        {current.parts.map((part, i) => (
                            <span key={part.text} className={TONE[part.tone]}>
                                {i > 0 ? " " : null}
                                {part.text}
                            </span>
                        ))}
                    </code>

                    <button
                        type="button"
                        onClick={copy}
                        aria-label={copied ? "Đã copy" : `Copy: ${command}`}
                        className="shrink-0 text-muted transition-colors hover:text-fg"
                    >
                        {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
