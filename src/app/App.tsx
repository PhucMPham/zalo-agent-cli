import { ChevronRight } from "lucide-react";
import Navbar from "./components/Navbar";
import DashboardPreview from "./components/DashboardPreview";

const ORANGE = "#ef4d23";
const VIDEO_SRC =
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4";
const POSTER_SRC = "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60";

export default function App() {
    return (
        <div
            className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4"
            style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
        >
            <div className="relative h-[calc(100vh-24px)] w-full overflow-hidden rounded-2xl bg-[#d9d9d9] sm:h-[calc(100vh-32px)] sm:rounded-3xl">
                <video
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    src={VIDEO_SRC}
                    poster={POSTER_SRC}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    disableRemotePlayback
                    webkit-playsinline="true"
                    x5-playsinline="true"
                />

                <div className="absolute inset-0 bg-white/10" />

                <div className="relative z-10">
                    <Navbar />

                    <div className="flex flex-col items-center px-4 pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
                        <div
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm"
                            style={{ fontSize: 13 }}
                        >
                            <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: ORANGE }}
                            />
                            Convix Software
                        </div>

                        <h1
                            className="mt-5 max-w-4xl text-neutral-900 sm:mt-6"
                            style={{
                                fontSize: "clamp(36px, 8vw, 72px)",
                                lineHeight: 1.05,
                                fontWeight: 500,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Shaping{" "}
                            <span
                                style={{
                                    fontFamily: "'Instrument Serif', serif",
                                    fontStyle: "italic",
                                    fontWeight: 400,
                                }}
                            >
                                Agencies
                            </span>
                            <br />
                            of tomorrow
                        </h1>

                        <p
                            className="mt-4 px-2 text-neutral-700 sm:mt-6"
                            style={{ fontSize: "clamp(13px, 3.5vw, 16px)" }}
                        >
                            The All-In-One Software Powering the Future of PR Agencies
                        </p>

                        <a
                            href="#"
                            className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#0b0f1a] py-2 pl-6 pr-2 text-white sm:mt-8 sm:py-2.5 sm:pl-7"
                            style={{ fontSize: 14 }}
                        >
                            Get Started
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 sm:h-7 sm:w-7">
                                <ChevronRight className="h-4 w-4" />
                            </span>
                        </a>
                    </div>

                    <div className="px-3 sm:px-4">
                        <DashboardPreview />
                    </div>
                </div>
            </div>
        </div>
    );
}
