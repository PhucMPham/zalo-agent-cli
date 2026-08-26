import { REPO_WIKI } from "./links";

export type Category = "all" | "canhan" | "oa" | "ai";

export interface CommandFilter {
    id: Category;
    label: string;
}

export interface CommandGroup {
    id: string;
    category: Exclude<Category, "all">;
    title: string;
    tags: string[];
    lines: string[];
    href: string;
}

export const FILTERS: CommandFilter[] = [
    { id: "all", label: "Tất cả" },
    { id: "canhan", label: "Tài khoản cá nhân" },
    { id: "oa", label: "Official Account" },
    { id: "ai", label: "AI Agent" },
];

export const GROUPS: CommandGroup[] = [
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

/** Filter ids in the order they appear on screen, for the sweep direction. */
export const FILTER_IDS: Category[] = FILTERS.map((filter) => filter.id);
