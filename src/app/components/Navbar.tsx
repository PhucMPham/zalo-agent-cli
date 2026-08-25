import { useState } from "react";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import Logo from "./Logo";
import { NPM_URL, REPO_URL, REPO_WIKI } from "../links";

const BLUE = "#0068ff";

function GithubMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
    );
}

const NAV_ITEMS = [
    { label: "Tính năng", href: "#tinh-nang", dot: true, accent: false, caret: false },
    { label: "Lệnh", href: "#lenh", dot: false, accent: false, caret: false },
    { label: "MCP", href: "#mcp", dot: false, accent: false, caret: false },
    { label: "Tài liệu", href: REPO_WIKI, dot: false, accent: true, caret: true },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
            <nav className="relative w-full max-w-[860px] rounded-full border border-neutral-200 bg-white py-2 pr-2 pl-2 shadow-sm">
                <div className="flex items-center gap-3 sm:gap-4">
                    <a href="#" className="flex shrink-0 items-center gap-2" aria-label="zalo-agent-cli">
                        <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
                        <span className="font-mono text-neutral-900" style={{ fontSize: 14, fontWeight: 600 }}>
                            zalo-agent
                        </span>
                    </a>

                    <div className="hidden items-center gap-6 md:flex" style={{ fontSize: 14 }}>
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap"
                                style={{ color: item.accent ? BLUE : "#0b0f1a" }}
                            >
                                {item.dot ? (
                                    <span
                                        className="inline-block rounded-full bg-black"
                                        style={{ width: 1.5, height: 1.5 }}
                                    />
                                ) : null}
                                {item.label}
                                {item.caret ? <ChevronDown className="h-3.5 w-3.5" /> : null}
                            </a>
                        ))}
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        <a
                            href={REPO_URL}
                            className="hidden text-neutral-800 sm:inline-flex"
                            aria-label="GitHub repository"
                        >
                            <GithubMark className="h-5 w-5" />
                        </a>

                        <a
                            href={NPM_URL}
                            className="inline-flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 whitespace-nowrap text-white sm:pl-5"
                            style={{ backgroundColor: BLUE, fontSize: 14 }}
                        >
                            <span className="hidden sm:inline">Cài đặt ngay</span>
                            <span className="sm:hidden">Cài đặt</span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                                <ChevronRight className="h-4 w-4" />
                            </span>
                        </a>

                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            className="inline-flex text-neutral-800 md:hidden"
                            aria-label="Mở menu"
                            aria-expanded={open}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {open ? (
                    <div className="absolute top-full right-2 left-2 z-20 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg md:hidden">
                        <div className="flex flex-col" style={{ fontSize: 14 }}>
                            {NAV_ITEMS.map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 hover:bg-neutral-50"
                                    style={{ color: item.accent ? BLUE : "#0b0f1a" }}
                                    onClick={() => setOpen(false)}
                                >
                                    {item.dot ? (
                                        <span
                                            className="inline-block rounded-full bg-black"
                                            style={{ width: 1.5, height: 1.5 }}
                                        />
                                    ) : null}
                                    {item.label}
                                    {item.caret ? <ChevronDown className="h-3.5 w-3.5" /> : null}
                                </a>
                            ))}
                            <a
                                href={REPO_URL}
                                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-neutral-50"
                                onClick={() => setOpen(false)}
                            >
                                <GithubMark className="h-4 w-4" />
                                GitHub
                            </a>
                        </div>
                    </div>
                ) : null}
            </nav>
        </div>
    );
}
