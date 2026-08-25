import { useState } from "react";
import { ChevronDown, ChevronRight, Menu, ShoppingCart } from "lucide-react";

const ORANGE = "#ef4d23";

function Logo({ className }: { className?: string }) {
    // 8 petals on a circle of radius 10 around (16,16) + one center circle.
    const petals = Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={16 + 10 * Math.cos(angle)} cy={16 + 10 * Math.sin(angle)} r={3.5} />;
    });

    return (
        <svg viewBox="0 0 32 32" className={className} fill={ORANGE} aria-hidden="true">
            {petals}
            <circle cx={16} cy={16} r={3.5} />
        </svg>
    );
}

const NAV_ITEMS = [
    { label: "Home", dot: true, accent: false, caret: false },
    { label: "Features", dot: false, accent: false, caret: false },
    { label: "About", dot: false, accent: false, caret: false },
    { label: "Pages", dot: false, accent: true, caret: true },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
            <nav className="relative w-full max-w-[760px] rounded-full border border-neutral-200 bg-white py-2 pl-2 pr-2 shadow-sm">
                <div className="flex items-center gap-4">
                    <a href="#" className="shrink-0" aria-label="Convix Software">
                        <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
                    </a>

                    <div className="hidden items-center gap-6 md:flex" style={{ fontSize: 14 }}>
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.label}
                                href="#"
                                className="inline-flex items-center gap-1.5 whitespace-nowrap"
                                style={{ color: item.accent ? ORANGE : "#0b0f1a" }}
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
                        <button type="button" className="hidden text-neutral-800 sm:inline-flex" aria-label="Cart">
                            <ShoppingCart className="h-5 w-5" />
                        </button>

                        <a
                            href="#"
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-4 pr-1.5 text-white sm:pl-5"
                            style={{ backgroundColor: ORANGE, fontSize: 14 }}
                        >
                            <span className="hidden sm:inline">Get early access</span>
                            <span className="sm:hidden">Early access</span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                                <ChevronRight className="h-4 w-4" />
                            </span>
                        </a>

                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            className="inline-flex text-neutral-800 md:hidden"
                            aria-label="Toggle menu"
                            aria-expanded={open}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {open ? (
                    <div className="absolute left-2 right-2 top-full z-20 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg md:hidden">
                        <div className="flex flex-col" style={{ fontSize: 14 }}>
                            {NAV_ITEMS.map((item) => (
                                <a
                                    key={item.label}
                                    href="#"
                                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 hover:bg-neutral-50"
                                    style={{ color: item.accent ? ORANGE : "#0b0f1a" }}
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
                        </div>
                    </div>
                ) : null}
            </nav>
        </div>
    );
}
