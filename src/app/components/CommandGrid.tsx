import { ArrowUpRight } from "lucide-react";
import CodeBlock from "./CodeBlock";
import { GROUPS, type Category } from "../command-groups";

/** The command cards for one filter, laid out two-up from md. */
export default function CommandGrid({ category }: { category: Category }) {
    const visible = GROUPS.filter((group) => category === "all" || group.category === category);

    return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {visible.map((group) => (
                <div key={group.id} className="group relative">
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
    );
}
