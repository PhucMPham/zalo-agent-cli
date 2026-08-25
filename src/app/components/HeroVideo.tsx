import { useEffect, useRef, useState } from "react";
import heroPoster from "../../../assets/hero-bg-poster.jpg";
import heroVideo from "../../../assets/hero-bg.mp4";

/**
 * The hero's animated backdrop — a seamless 60fps loop of the data-tunnel
 * render, sitting under the grid, the glow and the hero copy.
 *
 * The poster is painted first and the video cross-fades in only once it is
 * actually playing, so a slow connection (or an autoplay policy that blocks
 * the start) shows the still frame instead of a black gap. Under
 * prefers-reduced-motion the video is never mounted, so nothing is downloaded
 * and the still frame is all there is.
 */
export default function HeroVideo() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [animated, setAnimated] = useState(false);
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setAnimated(!reduced.matches);

        update();
        reduced.addEventListener("change", update);

        return () => reduced.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        if (!animated) {
            setPlaying(false);
            return;
        }

        // Safari and Firefox occasionally drop the autoplay attribute on a
        // freshly mounted element; asking once more is harmless when it took.
        videoRef.current?.play().catch(() => {
            // Autoplay refused — the poster stays, which is the fallback anyway.
        });
    }, [animated]);

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroPoster})` }} />

            {animated && (
                <video
                    ref={videoRef}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                        playing ? "opacity-100" : "opacity-0"
                    }`}
                    src={heroVideo}
                    poster={heroPoster}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    tabIndex={-1}
                    disableRemotePlayback
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    onPlaying={() => setPlaying(true)}
                />
            )}

            {/*
             * Legibility scrim. Narrow viewports get a flat, heavy wash because
             * the copy spans the full width there; from md up the copy is a
             * left-hand column, so the wash leans left and lets the tunnel's
             * bright core stay visible on the right.
             */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,5,0.94)_0%,rgba(5,5,5,0.88)_55%,rgba(5,5,5,0.94)_100%)] md:bg-[linear-gradient(to_right,rgba(5,5,5,0.96)_0%,rgba(5,5,5,0.82)_38%,rgba(5,5,5,0.52)_70%,rgba(5,5,5,0.42)_100%)]" />

            {/* Vignette that dissolves the clip's edges into the page background. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#050505_0%,transparent_22%,transparent_70%,#050505_100%)]" />
        </div>
    );
}
