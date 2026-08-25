import { Bot, KeyRound, Network, QrCode } from "lucide-react";

const BLUE = "#0068ff";

type Line = { prompt?: boolean; text: string; tone?: "cmd" | "out" | "ok" | "dim" };

const SESSION: Line[] = [
    { prompt: true, text: "npm install -g zalo-agent-cli", tone: "cmd" },
    { prompt: true, text: "zalo-agent login", tone: "cmd" },
    { text: "✓ Quét QR bằng Zalo app — credentials đã lưu (chmod 0600)", tone: "ok" },
    { prompt: true, text: "zalo-agent listen --json", tone: "cmd" },
    { text: '{"threadId":"7391…","dName":"Phúc","text":"Đơn của mình tới đâu rồi?"}', tone: "out" },
    { prompt: true, text: 'zalo-agent msg send 7391… "Đơn đang giao, mã VD123"', tone: "cmd" },
    { text: "✓ sent · msgId 4820193", tone: "ok" },
    { prompt: true, text: "zalo-agent msg bank-card 7391… -a 250000 --bank VCB", tone: "cmd" },
    { text: "✓ thẻ chuyển khoản + QR VietQR đã gửi", tone: "ok" },
    { prompt: true, text: "", tone: "dim" },
];

const TONE: Record<string, string> = {
    cmd: "#e6edf3",
    out: "#8b98a5",
    ok: "#3fb950",
    dim: "#8b98a5",
};

function TerminalCard() {
    return (
        <div className="overflow-hidden rounded-2xl bg-[#0b0f1a] sm:col-span-2">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 font-mono text-white/50" style={{ fontSize: 11 }}>
                    zalo-agent — bash
                </span>
            </div>

            <div className="overflow-x-auto p-4 sm:p-5">
                <pre className="font-mono leading-6 whitespace-pre" style={{ fontSize: 12 }}>
                    {SESSION.map((line, i) => (
                        <div key={i}>
                            {line.prompt ? <span style={{ color: BLUE }}>$ </span> : null}
                            <span style={{ color: TONE[line.tone ?? "out"] }}>{line.text}</span>
                            {line.text === "" ? <span className="text-white/70">▌</span> : null}
                        </div>
                    ))}
                </pre>
            </div>
        </div>
    );
}

const HIGHLIGHTS = [
    { icon: Bot, title: "MCP server", body: "get_messages · send_message · list_threads · mark_read" },
    { icon: Network, title: "Đa tài khoản + proxy", body: "Mỗi tài khoản một proxy riêng, 1:1" },
    { icon: QrCode, title: "Chuyển khoản & VietQR", body: "Thẻ chuyển khoản cho 55+ ngân hàng VN" },
    { icon: KeyRound, title: "Official Account v3.0", body: "OAuth, follower, tag, webhook listener" },
];

function HighlightsCard() {
    return (
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3">
                    <span
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "#e8f0ff", color: BLUE }}
                    >
                        <Icon className="h-4 w-4" />
                    </span>
                    <div>
                        <div className="text-neutral-900" style={{ fontSize: 13, fontWeight: 600 }}>
                            {title}
                        </div>
                        <div className="mt-0.5 text-neutral-500" style={{ fontSize: 12 }}>
                            {body}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const STATS = [
    { value: "90+", label: "lệnh CLI" },
    { value: "15+", label: "nhóm lệnh" },
    { value: "55+", label: "ngân hàng VN" },
    { value: "--json", label: "trên mọi lệnh" },
];

export default function TerminalPreview() {
    return (
        <div className="mx-auto w-full max-w-[920px] rounded-3xl bg-[#eef1f6] p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                <TerminalCard />
                <HighlightsCard />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-4">
                {STATS.map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-white px-5 py-4 text-center">
                        <div className="font-mono text-neutral-900" style={{ fontSize: 20, fontWeight: 600 }}>
                            {stat.value}
                        </div>
                        <div className="mt-0.5 text-neutral-500" style={{ fontSize: 12 }}>
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
