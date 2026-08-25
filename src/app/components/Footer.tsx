import CodeBlock from "./CodeBlock";
import { DISCLAIMER_URL, INSTALL_COMMAND, NPM_URL, REPO_URL, REPO_WIKI, SKILL_URL, VERSION } from "../links";

const STEPS = [
    { step: "1", label: "Cài đặt", lines: [INSTALL_COMMAND] },
    { step: "2", label: "Đăng nhập bằng QR", lines: ["zalo-agent login"] },
    { step: "3", label: "Lấy threadId", lines: ["zalo-agent listen --json"] },
    { step: "4", label: "Gửi tin nhắn", lines: ['zalo-agent msg send <THREAD_ID> "Xin chào!"'] },
];

const LINKS = [
    { label: "GitHub", href: REPO_URL },
    { label: "npm", href: NPM_URL },
    { label: "Wiki", href: REPO_WIKI },
    { label: "SKILL.md", href: SKILL_URL },
];

export default function Footer() {
    return (
        <footer id="bat-dau" className="relative overflow-hidden border-t border-line bg-surface pt-24">
            <div className="pointer-events-none absolute inset-0 z-0 opacity-10">
                <div className="absolute top-0 right-0 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/3 rounded-full bg-brand mix-blend-screen blur-[150px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-6 pb-12">
                <div className="mb-24 grid grid-cols-1 gap-16 lg:grid-cols-2">
                    <div className="space-y-12" data-reveal>
                        <div>
                            <h2 className="mb-6 font-display text-5xl font-bold md:text-6xl">
                                Một lệnh để cài. <span className="text-brand">Xong.</span>
                            </h2>
                            <p className="max-w-md text-lg text-muted">
                                Không cần dịch vụ trung gian, không cần server. Cài bằng npm và chạy ngay trên máy bạn.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="mb-2 font-display text-4xl font-bold">MIT</p>
                                <p className="text-sm tracking-wider text-muted uppercase">Giấy phép</p>
                            </div>
                            <div>
                                <p className="mb-2 font-display text-4xl font-bold">≥ 20</p>
                                <p className="text-sm tracking-wider text-muted uppercase">Node.js</p>
                            </div>
                            <div>
                                <p className="mb-2 font-display text-4xl font-bold">v{VERSION}</p>
                                <p className="text-sm tracking-wider text-muted uppercase">Phiên bản</p>
                            </div>
                            <div>
                                <p className="mb-2 font-display text-4xl font-bold">0</p>
                                <p className="text-sm tracking-wider text-muted uppercase">Dịch vụ bên thứ ba</p>
                            </div>
                        </div>
                    </div>

                    <div data-reveal className="rounded-3xl border border-line bg-bg p-8 shadow-card">
                        <h3 className="mb-8 font-display text-2xl font-bold">Bắt đầu trong 4 bước</h3>

                        <ol className="space-y-6">
                            {STEPS.map((item) => (
                                <li key={item.step} className="flex gap-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-sm text-brand">
                                        {item.step}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="mb-2 text-sm font-medium">{item.label}</p>
                                        <div className="rounded-lg border border-line bg-surface px-4 py-3">
                                            <CodeBlock lines={item.lines} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <a
                            href={REPO_WIKI}
                            className="mt-8 block w-full rounded-xl bg-brand py-4 text-center text-lg font-bold text-bg shadow-glow transition-all hover:bg-brand-hover"
                        >
                            Đọc tài liệu đầy đủ
                        </a>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-sm text-muted md:flex-row">
                    <p>
                        MIT © zalo-agent-cli · Không liên kết với Zalo hay VNG ·{" "}
                        <a href={DISCLAIMER_URL} className="underline underline-offset-4 hover:text-fg">
                            DISCLAIMER
                        </a>
                    </p>
                    <div className="flex gap-8">
                        {LINKS.map((link) => (
                            <a key={link.label} href={link.href} className="transition-colors hover:text-fg">
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
