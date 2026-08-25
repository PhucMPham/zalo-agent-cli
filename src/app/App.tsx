import { ChevronRight, TriangleAlert } from "lucide-react";
import Navbar from "./components/Navbar";
import TerminalPreview from "./components/TerminalPreview";
import InstallCommand from "./components/InstallCommand";
import { DISCLAIMER_URL, REPO_URL } from "./links";
import demoVideo from "../../assets/demo.mp4";

const BLUE = "#0068ff";

export default function App() {
    return (
        <div
            className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4"
            style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
        >
            <div className="relative h-[calc(100vh-24px)] w-full overflow-hidden rounded-2xl bg-[#e8eef7] sm:h-[calc(100vh-32px)] sm:rounded-3xl">
                {/* Ambient backdrop: the project's own terminal demo, dimmed to a texture. */}
                <video
                    className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-[2px]"
                    src={demoVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    disableRemotePlayback
                    webkit-playsinline="true"
                    x5-playsinline="true"
                />

                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(240,245,255,0.86) 45%, rgba(232,238,247,0.94) 100%)",
                    }}
                />

                <div className="relative z-10">
                    <Navbar />

                    <div className="flex flex-col items-center px-4 pt-10 pb-8 text-center sm:pt-14 sm:pb-10">
                        <div
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm"
                            style={{ fontSize: 13 }}
                        >
                            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BLUE }} />
                            <span className="font-mono">zalo-agent-cli</span>
                            <span className="text-neutral-400">v1.6.2 · MIT</span>
                        </div>

                        <h1
                            className="mt-5 max-w-4xl text-neutral-900 sm:mt-6"
                            style={{
                                fontSize: "clamp(32px, 8vw, 72px)",
                                lineHeight: 1.05,
                                fontWeight: 500,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Tự động hóa{" "}
                            <span
                                style={{
                                    fontFamily: "'Instrument Serif', serif",
                                    fontStyle: "italic",
                                    fontWeight: 400,
                                }}
                            >
                                Zalo
                            </span>
                            <br />
                            ngay trong terminal
                        </h1>

                        <p
                            className="mt-4 max-w-2xl px-2 text-neutral-700 sm:mt-6"
                            style={{ fontSize: "clamp(13px, 3.5vw, 16px)" }}
                        >
                            90+ lệnh cho tin nhắn, nhóm, bạn bè và thanh toán QR — đa tài khoản, proxy riêng, output{" "}
                            <code className="font-mono">--json</code> cho mọi lệnh để script và AI agent dùng được ngay.
                        </p>

                        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row">
                            <a
                                href={REPO_URL}
                                className="inline-flex items-center gap-3 rounded-full bg-[#0b0f1a] py-2 pr-2 pl-6 text-white sm:py-2.5 sm:pl-7"
                                style={{ fontSize: 14 }}
                            >
                                Bắt đầu nhanh
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 sm:h-7 sm:w-7">
                                    <ChevronRight className="h-4 w-4" />
                                </span>
                            </a>
                            <InstallCommand />
                        </div>

                        <a
                            href={DISCLAIMER_URL}
                            className="mt-4 inline-flex max-w-md items-start gap-1.5 text-left text-neutral-500 hover:text-neutral-700"
                            style={{ fontSize: 12 }}
                        >
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>Dùng API Zalo không chính thức — tài khoản có thể bị hạn chế. Đọc DISCLAIMER.</span>
                        </a>
                    </div>

                    <div className="px-3 sm:px-4">
                        <TerminalPreview />
                    </div>
                </div>
            </div>
        </div>
    );
}
