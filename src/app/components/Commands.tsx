import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import CodeBlock from "./CodeBlock";
import AsciiSweep from "./canvasui/AsciiSweep";
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

function CommandGrid({ category }: { category: Category }) {
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

/** Seconds the ascii band takes to cross the panel. */
const SWEEP_SECONDS = 1.4;

export default function Commands() {
    // The sweep runs between two panels, so the four filters ping-pong across a
    // pair of slots: the incoming filter is written to whichever slot is idle,
    // and flipping the index is what fires the sweep.
    const [slot, setSlot] = useState<0 | 1>(0);
    const [panels, setPanels] = useState<[Category, Category]>(["all", "all"]);
    const [angle, setAngle] = useState(0);
    const [sweeping, setSweeping] = useState(false);
    const [heights, setHeights] = useState<[number, number]>([0, 0]);
    // The effect captures both panels up front, which is a full walk of this
    // subtree on every browser without html-in-canvas. Hold it back until the
    // section is nearly in view, so that cost never lands during page load, and
    // skip it below md, where the single-column grid is several times taller and
    // the capture costs that much more on the weakest devices.
    const [near, setNear] = useState(false);
    const [wide, setWide] = useState(false);
    const armed = near && wide;

    const active = panels[slot];
    const stageRef = useRef<HTMLDivElement>(null);
    const panelRefs = useRef<Array<HTMLDivElement | null>>([null, null]);
    const sweepTimer = useRef(0);

    useEffect(() => {
        const query = window.matchMedia("(min-width: 768px)");
        const update = () => setWide(query.matches);

        update();
        query.addEventListener("change", update);

        return () => query.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const node = stageRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                setNear(true);
                observer.disconnect();
            },
            { rootMargin: "600px" },
        );
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    // Both panels are absolutely positioned, so the section has no height of its
    // own. Track each one and give the stage the height it needs — the taller of
    // the two while a sweep is in flight, so neither side is clipped.
    useLayoutEffect(() => {
        const measure = () =>
            setHeights([panelRefs.current[0]?.offsetHeight ?? 0, panelRefs.current[1]?.offsetHeight ?? 0]);

        const observer = new ResizeObserver(measure);
        panelRefs.current.forEach((element) => element && observer.observe(element));
        measure();

        return () => observer.disconnect();
    }, [armed]);

    useEffect(() => () => window.clearTimeout(sweepTimer.current), []);

    // onSweepEnd is the engine's signal, but its loop pauses when the section
    // scrolls out of view, so a sweep left mid-flight would never report back
    // and the stage would stay stuck at the taller height. Time it out too.
    const startSweep = useCallback(() => {
        setSweeping(true);
        window.clearTimeout(sweepTimer.current);
        sweepTimer.current = window.setTimeout(() => setSweeping(false), SWEEP_SECONDS * 1000 + 600);
    }, []);

    const endSweep = useCallback(() => {
        window.clearTimeout(sweepTimer.current);
        setSweeping(false);
    }, []);

    const select = useCallback(
        (next: Category) => {
            if (next === active) return;

            // Sweep the way the eye travels along the filter row.
            const from = FILTERS.findIndex((filter) => filter.id === active);
            const to = FILTERS.findIndex((filter) => filter.id === next);
            setAngle(to > from ? 0 : 180);

            const target: 0 | 1 = slot === 0 ? 1 : 0;
            setPanels((prev) => (target === 0 ? [next, prev[1]] : [prev[0], next]));
            setSlot(target);
        },
        [active, slot],
    );

    const height = sweeping ? Math.max(heights[0], heights[1]) : heights[slot];

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

                    <div className="mt-6 flex flex-wrap gap-2 md:mt-0" role="tablist" aria-label="Lọc nhóm lệnh">
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                type="button"
                                role="tab"
                                onClick={() => select(filter.id)}
                                aria-selected={active === filter.id}
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

                <div
                    ref={stageRef}
                    className="transition-[height] duration-500 ease-out motion-reduce:transition-none"
                    style={armed ? { height: height || undefined } : undefined}
                >
                    {armed ? (
                        <AsciiSweep
                            className="h-full w-full"
                            index={slot}
                            directional={false}
                            angle={angle}
                            duration={SWEEP_SECONDS}
                            color="#ffe500"
                            charset="ascii"
                            displace={10}
                            aberration={4}
                            onSweepStart={startSweep}
                            onSweepEnd={endSweep}
                            alternate={
                                <div ref={(element) => void (panelRefs.current[1] = element)}>
                                    <CommandGrid category={panels[1]} />
                                </div>
                            }
                        >
                            <div ref={(element) => void (panelRefs.current[0] = element)}>
                                <CommandGrid category={panels[0]} />
                            </div>
                        </AsciiSweep>
                    ) : (
                        <div ref={(element) => void (panelRefs.current[0] = element)}>
                            <CommandGrid category={active} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
