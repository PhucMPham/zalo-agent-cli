import HeroVideo from "./HeroVideo";
import InstallBlock from "./InstallBlock";
import LiquidStage from "./LiquidStage";
import { REPO_URL, VERSION } from "../links";

export default function Hero() {
    return (
        <section id="hero" className="border-b border-line/50">
            <LiquidStage className="relative">
                <div className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden px-6 pt-24 pb-20">
                    <HeroVideo />

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                    <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 mix-blend-screen blur-[100px]" />

                    <div className="relative z-10 mx-auto w-full max-w-7xl">
                        <div data-reveal className="mb-8 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
                            </span>
                            <span className="text-sm font-medium tracking-wide">
                                Mã nguồn mở · MIT · v{VERSION} trên npm
                            </span>
                        </div>

                        <h1
                            data-reveal
                            className="mb-12 font-display text-4xl leading-tight font-bold md:text-6xl lg:text-7xl"
                        >
                            Tự động hóa{" "}
                            <span className="animate-float relative inline-flex h-[0.9em] w-auto items-center justify-center rounded-full border border-line bg-code-bg px-[0.35em] align-middle shadow-glow">
                                <span className="font-mono text-sm font-bold text-brand md:text-xl">
                                    <span aria-hidden="true">{"{ "}</span>
                                    Zalo
                                    <span aria-hidden="true">{" }"}</span>
                                </span>
                            </span>{" "}
                            ngay trong <br className="hidden md:block" />
                            terminal{" "}
                            <span
                                className="animate-float relative inline-flex h-[0.9em] w-auto items-center justify-center rounded-full border border-line bg-code-bg px-[0.35em] align-middle shadow-glow"
                                style={{ animationDelay: "3s" }}
                                aria-hidden="true"
                            >
                                <span className="font-mono text-sm font-bold text-brand md:text-xl">
                                    $ <span className="animate-blink">_</span>
                                </span>
                            </span>{" "}
                            của bạn
                        </h1>

                        <div data-reveal className="mt-8 max-w-lg">
                            <p className="mb-6 text-lg text-muted">
                                90+ lệnh cho tin nhắn, nhóm, bạn bè và thanh toán QR. Đa tài khoản, proxy riêng, và một
                                MCP server để AI agent dùng trực tiếp.
                            </p>

                            <InstallBlock />

                            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
                                <a href={REPO_URL} className="underline underline-offset-4 hover:text-fg">
                                    Xem trên GitHub
                                </a>
                                <span className="font-mono">Node.js ≥ 20</span>
                            </div>
                        </div>
                    </div>
                </div>
            </LiquidStage>
        </section>
    );
}
