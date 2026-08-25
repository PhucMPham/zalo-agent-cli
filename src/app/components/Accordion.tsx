import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type AccordionItem = {
    id: string;
    title: string;
    meta?: string;
    subtitle?: string;
    body: ReactNode;
};

export default function Accordion({ items, variant = "panel" }: { items: AccordionItem[]; variant?: "panel" | "faq" }) {
    const [openId, setOpenId] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            {items.map((item) => {
                const open = openId === item.id;

                return (
                    <div
                        key={item.id}
                        data-reveal
                        className={`group overflow-hidden rounded-2xl border border-line bg-surface transition-colors ${
                            open ? "border-brand" : "hover:border-brand"
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setOpenId(open ? null : item.id)}
                            aria-expanded={open}
                            className="flex w-full cursor-pointer flex-col justify-between gap-4 p-6 text-left md:flex-row md:items-center md:p-8"
                        >
                            <div>
                                <h3
                                    className={`font-bold transition-colors ${
                                        variant === "faq" ? "text-lg" : "text-xl"
                                    } ${open ? "text-brand" : "group-hover:text-brand"}`}
                                >
                                    {item.title}
                                </h3>
                                {item.subtitle ? <p className="text-muted">{item.subtitle}</p> : null}
                            </div>

                            <div className="flex items-center gap-4">
                                {item.meta ? <span className="font-mono text-sm text-muted">{item.meta}</span> : null}
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-bg text-muted group-hover:text-fg">
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-300 ${
                                            open ? "rotate-180" : ""
                                        }`}
                                    />
                                </span>
                            </div>
                        </button>

                        <div
                            className={`grid transition-all duration-500 ease-in-out ${
                                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                        >
                            <div className="overflow-hidden bg-surface-hover">
                                <div className="border-t border-line p-6 md:p-8">{item.body}</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
