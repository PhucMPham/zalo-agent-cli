import { useEffect, useRef, useState } from "react";
import demoVideo from "../../../assets/demo.mp4";

const SCRIPT = [
    "$ zalo-agent login",
    "✓ QR đã quét — credentials lưu ở chế độ 0600",
    "$ zalo-agent listen --json | jq .text",
    '"Đơn của mình tới đâu rồi?"',
    '$ zalo-agent msg send 7391… "Đơn đang giao, mã VD123"',
    "✓ sent · msgId 4820193",
].join("\n");

const STATS = [
    { value: "90+", label: "lệnh CLI" },
    { value: "15+", label: "nhóm lệnh" },
    { value: "55+", label: "ngân hàng VN" },
];

function line(text: string) {
    if (text.startsWith("$")) {
        return (
            <>
                <span className="text-brand">$</span>
                <span className="text-neutral-300">{text.slice(1)}</span>
            </>
        );
    }
    if (text.startsWith("✓")) {
        return <span className="text-code-comment">{text}</span>;
    }
    return <span className="text-code-string">{text}</span>;
}

function Typewriter() {
    const [typed, setTyped] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        let index = 0;
        let timer = 0;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const type = () => {
            index += 1;
            setTyped(SCRIPT.slice(0, index));
            if (index < SCRIPT.length) {
                timer = window.setTimeout(type, 18 + Math.random() * 25);
            }
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                if (reduced) {
                    setTyped(SCRIPT);
                } else {
                    type();
                }
            });
        });

        observer.observe(node);

        return () => {
            observer.disconnect();
            window.clearTimeout(timer);
        };
    }, []);

    return (
        <div ref={ref} className="flex h-64 flex-col justify-end overflow-hidden p-6 font-mono text-sm leading-relaxed">
            {typed.split("\n").map((text, i) => (
                <div key={i}>{line(text)}</div>
            ))}
            <span className="animate-blink text-brand">▌</span>
        </div>
    );
}

export default function Showcase() {
    return (
        <section className="bg-bg px-6 py-24 md:py-32">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-20">
                <div data-reveal>
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1">
                        <span className="h-2 w-2 rounded-full bg-brand" />
                        <span className="font-mono text-xs tracking-widest text-muted uppercase">CLI cho Zalo</span>
                    </div>

                    <h2 className="mb-6 font-display text-4xl font-bold md:text-5xl">
                        Gõ lệnh, <br />
                        <span className="text-brand">không viết bot.</span>
                    </h2>

                    <p className="mb-8 text-lg leading-relaxed text-muted">
                        Mọi thao tác Zalo — gửi tin, quản lý nhóm, lắng nghe hội thoại, gửi thẻ chuyển khoản — đều là
                        một lệnh. Mọi lệnh đều có <strong className="text-fg">--json</strong>, nên script bash, cron hay
                        AI agent đều dùng được ngay mà không cần viết thêm lớp tích hợp nào.
                    </p>

                    <div className="flex gap-12 font-mono text-sm">
                        {STATS.map((stat) => (
                            <div key={stat.label}>
                                <span className="mb-1 block font-display text-3xl font-bold text-fg">{stat.value}</span>
                                <span className="text-muted">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div data-reveal className="group animate-float relative">
                    <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-brand to-zalo opacity-25 blur transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />

                    <div className="relative overflow-hidden rounded-xl border border-line bg-code-bg shadow-2xl">
                        <div className="flex items-center justify-between border-b border-line/50 bg-surface px-4 py-3">
                            <div className="flex gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-500" />
                                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                                <span className="h-3 w-3 rounded-full bg-green-500" />
                            </div>
                            <div className="font-mono text-xs text-muted">zalo-agent — ~/shop</div>
                            <div className="w-10" />
                        </div>
                        <Typewriter />
                    </div>
                </div>
            </div>

            <div data-reveal className="mx-auto mt-20 max-w-5xl">
                <div className="overflow-hidden rounded-2xl border border-line bg-code-bg shadow-card">
                    <div className="flex items-center gap-2 border-b border-line/50 bg-surface px-4 py-3">
                        <span className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="h-3 w-3 rounded-full bg-yellow-500" />
                        <span className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="ml-2 font-mono text-xs text-muted">demo — phiên làm việc thật</span>
                    </div>
                    <video
                        className="w-full"
                        src={demoVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        disableRemotePlayback
                        webkit-playsinline="true"
                        x5-playsinline="true"
                    />
                </div>
            </div>
        </section>
    );
}
