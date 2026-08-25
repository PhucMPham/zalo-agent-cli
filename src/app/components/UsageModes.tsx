import { Bot, Puzzle, Terminal } from "lucide-react";
import { MCP_GUIDE_URL, REPO_WIKI, SKILL_URL } from "../links";

const MODES = [
    {
        number: "01",
        icon: Terminal,
        title: (
            <>
                Dùng như
                <br />
                một CLI
            </>
        ),
        body: "Đăng nhập QR, gửi tin, quản lý nhóm và bạn bè ngay trong terminal. Chế độ interactive cho người dùng, phi tương tác cho script và CI/CD.",
        href: REPO_WIKI,
    },
    {
        number: "02",
        icon: Bot,
        title: (
            <>
                MCP server
                <br />
                cho AI agent
            </>
        ),
        body: "get_messages · send_message · list_threads · mark_read. Chạy stdio cho Claude Code hoặc HTTP có auth cho VPS, kèm auto-reconnect và bộ lọc thread giảm nhiễu.",
        href: MCP_GUIDE_URL,
    },
    {
        number: "03",
        icon: Puzzle,
        title: (
            <>
                Skill cho
                <br />
                agent bất kỳ
            </>
        ),
        body: "Cài SKILL.md qua ClawHub cho OpenClaw, hoặc copy thư mục skill/ vào Claude Code. Kèm sẵn eval scenarios để kiểm tra agent làm đúng.",
        href: SKILL_URL,
    },
];

export default function UsageModes() {
    return (
        <section id="ai" className="bg-surface px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <div data-reveal className="mb-16 flex flex-col justify-between md:flex-row md:items-end">
                    <div className="max-w-2xl">
                        <h2 className="mb-6 font-display text-4xl font-bold md:text-5xl">Ba cách dùng</h2>
                        <p className="text-lg text-muted">
                            Cùng một binary — cho người gõ lệnh, cho agent gọi tool, và cho agent đọc skill.
                        </p>
                    </div>
                    <a
                        href={SKILL_URL}
                        className="mt-8 inline-flex items-center gap-2 font-bold text-brand transition-colors hover:text-fg md:mt-0"
                    >
                        Xem SKILL.md
                        <span aria-hidden="true">→</span>
                    </a>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {MODES.map((mode) => (
                        <a
                            key={mode.number}
                            href={mode.href}
                            data-reveal
                            className="group relative overflow-hidden rounded-2xl border border-line bg-bg p-8 transition-all duration-300 hover:border-brand"
                        >
                            <div className="absolute -top-6 -right-6 font-display text-[120px] font-bold text-surface-hover opacity-50 transition-colors duration-300 select-none group-hover:text-surface">
                                {mode.number}
                            </div>

                            <div className="relative z-10 flex h-full flex-col justify-between">
                                <div>
                                    <div className="mb-6 flex h-12 w-12 items-center justify-center">
                                        <mode.icon className="h-10 w-10 text-brand" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="mb-3 font-display text-2xl font-bold">{mode.title}</h3>
                                    <p className="mb-6 text-sm leading-relaxed text-muted">{mode.body}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="h-px w-full bg-line transition-colors group-hover:bg-brand/50" />
                                    <span className="-translate-x-2 font-mono text-xs text-brand opacity-0 transition-opacity duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                                        XEM
                                    </span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
