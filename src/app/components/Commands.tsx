import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import CodeBlock from "./CodeBlock";
import { REPO_WIKI } from "../links";

type Category = "all" | "canhan" | "oa" | "ai";

const FILTERS: Array<{ id: Category; label: string }> = [
    { id: "all", label: "Tất cả" },
    { id: "canhan", label: "Tài khoản cá nhân" },
    { id: "oa", label: "Official Account" },
    { id: "ai", label: "AI Agent" },
];

const GROUPS: Array<{
    id: string;
    category: Exclude<Category, "all">;
    title: string;
    tags: string[];
    lines: string[];
    href: string;
}> = [
    {
        id: "msg",
        category: "canhan",
        title: "Tin nhắn & media",
        tags: ["msg", "quick-msg", "poll"],
        href: `${REPO_WIKI}/Tin-Nh%E1%BA%AFn`,
        lines: [
            "# gửi cho cá nhân",
            'zalo-agent msg send <THREAD_ID> "Xin chào!"',
            "",
            "# gửi vào nhóm",
            'zalo-agent msg send <THREAD_ID> "Chào nhóm" -t 1',
            "",
            "# ảnh, file, voice, video, sticker",
            "zalo-agent msg image <THREAD_ID> ./banner.png",
        ],
    },
    {
        id: "bank",
        category: "canhan",
        title: "Chuyển khoản & VietQR",
        tags: ["55+ ngân hàng", "QR"],
        href: `${REPO_WIKI}/Th%E1%BA%BB-Chuy%E1%BB%83n-Kho%E1%BA%A3n-&-QR`,
        lines: [
            "# thẻ chuyển khoản trong hội thoại",
            "zalo-agent msg bank-card <THREAD_ID> \\",
            "  --bank VCB --account 0123456789 \\",
            '  --amount 250000 --note "Đơn VD123"',
            "",
            "# hoặc chỉ gửi ảnh QR VietQR",
            "zalo-agent msg qr <THREAD_ID> --bank TCB",
        ],
    },
    {
        id: "listen",
        category: "canhan",
        title: "Lắng nghe & webhook",
        tags: ["listen", "auto-reply", "JSONL"],
        href: `${REPO_WIKI}/L%E1%BA%AFng-Nghe`,
        lines: [
            "# in threadId của mọi tin nhắn đến",
            "zalo-agent listen --json",
            "",
            "# đẩy sang webhook + lưu JSONL",
            "zalo-agent listen \\",
            "  --webhook https://api.shop.vn/zalo \\",
            "  --save ./messages.jsonl",
        ],
    },
    {
        id: "oa",
        category: "oa",
        title: "Official Account API v3.0",
        tags: ["OAuth", "follower", "tag"],
        href: `${REPO_WIKI}/Official-Account`,
        lines: [
            "# wizard cấu hình OA",
            "zalo-agent oa init",
            "",
            "# phi tương tác (cho AI agent / CI)",
            "zalo-agent oa init --app-id <ID> \\",
            "  --secret <KEY> --skip-webhook",
            "",
            'zalo-agent oa msg text <USER_ID> "Xin chào"',
            "zalo-agent oa listen -p 3000",
        ],
    },
    {
        id: "mcp",
        category: "ai",
        title: "MCP server",
        tags: ["stdio", "HTTP", "4 tools"],
        href: `${REPO_WIKI}`,
        lines: [
            "# Claude Code chạy local",
            "zalo-agent mcp start",
            "",
            "# VPS, có auth",
            "zalo-agent mcp start --http 3847 \\",
            "  --auth <SECRET>",
            "",
            "# tools: get_messages · send_message",
            "#        list_threads · mark_read",
        ],
    },
    {
        id: "account",
        category: "canhan",
        title: "Đa tài khoản & proxy",
        tags: ["account", "proxy 1:1"],
        href: `${REPO_WIKI}/%C4%90a-T%C3%A0i-Kho%E1%BA%A3n-&-Proxy`,
        lines: [
            "zalo-agent account add shop-1",
            "zalo-agent account proxy set shop-1 \\",
            "  http://user:pass@10.0.0.1:8080",
            "",
            "# chạy lệnh dưới một tài khoản cụ thể",
            'zalo-agent msg send <ID> "hi" --account shop-1',
        ],
    },
];

export default function Commands() {
    const [active, setActive] = useState<Category>("all");
    const visible = GROUPS.filter((g) => active === "all" || g.category === active);

    return (
        <section id="lenh" className="border-y border-line bg-surface px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <div data-reveal className="mb-12 flex flex-col justify-between md:flex-row md:items-end">
                    <div>
                        <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">15+ nhóm lệnh</h2>
                        <p className="text-muted">
                            Phủ gần hết tính năng Zalo — và tất cả đều nhận <code className="font-mono">--json</code>.
                        </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2 md:mt-0">
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setActive(filter.id)}
                                aria-pressed={active === filter.id}
                                className={`rounded-full border px-4 py-2 font-medium transition-all ${
                                    active === filter.id
                                        ? "border-brand bg-brand text-bg"
                                        : "border-line text-muted hover:border-white hover:text-fg"
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {visible.map((group) => (
                        <div key={group.id} data-reveal className="group relative">
                            <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-code-bg shadow-card">
                                <div className="absolute inset-0 flex items-center p-6 opacity-80 transition-opacity group-hover:opacity-100">
                                    <CodeBlock lines={group.lines} />
                                </div>
                                <div className="absolute top-4 right-4 rounded-full border border-line bg-bg/80 px-3 py-1 font-mono text-xs font-bold backdrop-blur">
                                    {group.id}
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="mb-2 font-display text-2xl font-bold transition-colors group-hover:text-brand">
                                        {group.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 text-sm text-muted">
                                        {group.tags.map((tag, i) => (
                                            <span key={tag}>
                                                {i > 0 ? <span className="mr-2">•</span> : null}
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <a
                                    href={group.href}
                                    aria-label={`Tài liệu ${group.title}`}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line transition-all group-hover:-translate-y-1 hover:border-brand hover:bg-brand hover:text-bg"
                                >
                                    <ArrowUpRight className="h-5 w-5" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
