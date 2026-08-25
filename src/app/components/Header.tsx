import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NPM_URL } from "../links";

const NAV = [
    { label: "Lệnh", href: "#lenh" },
    { label: "Tính năng", href: "#tinh-nang" },
    { label: "Dành cho AI", href: "#ai" },
    { label: "FAQ", href: "#faq" },
];

export default function Header() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <header
            className={`fixed top-0 right-0 left-0 z-50 border-b border-line ${
                open ? "bg-bg" : "bg-bg/80 backdrop-blur-md"
            }`}
        >
            <div className="relative z-50 mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
                <a href="#" className="flex items-center gap-1 font-display text-2xl font-bold tracking-tight">
                    zalo-agent
                    <span className="font-mono text-xl text-brand">.cli()</span>
                </a>

                <nav className="hidden items-center gap-8 md:flex">
                    {NAV.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className="text-sm font-medium text-muted transition-colors hover:text-fg"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <a
                        href={NPM_URL}
                        className="hidden items-center justify-center rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-semibold transition-all hover:border-muted hover:bg-surface-hover md:inline-flex"
                    >
                        Cài đặt
                    </a>

                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="p-2 text-fg hover:text-brand md:hidden"
                        aria-label={open ? "Đóng menu" : "Mở menu"}
                        aria-expanded={open}
                    >
                        {open ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
                    </button>
                </div>
            </div>

            {open ? (
                <div className="fixed inset-0 z-40 flex flex-col space-y-6 bg-bg px-6 pt-24">
                    {NAV.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="block border-b border-line pb-4 font-display text-2xl font-bold"
                        >
                            {item.label}
                        </a>
                    ))}
                    <a
                        href={NPM_URL}
                        onClick={() => setOpen(false)}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand px-6 py-4 text-lg font-bold text-bg"
                    >
                        Cài đặt ngay
                    </a>
                </div>
            ) : null}
        </header>
    );
}
