import { useEffect, useState, type ReactNode } from "react";
import ParticleScroll, { supportsHtmlInCanvas } from "./canvasui/ParticleScroll";

/**
 * Runs the whole page through Canvas UI's ParticleScroll, so everything below
 * the formation line is drifting sand that reassembles as it scrolls up.
 *
 * The effect reads its own scroll position, which means the page has to scroll
 * inside the component rather than in the window. That is a real trade — it
 * costs the browser's native scroll behaviour, the mobile URL-bar collapse
 * among it — and the component has no fallback: without the experimental
 * html-in-canvas API it renders a transparent quad and skips the particles
 * altogether. So the swap only happens where the effect can be seen, and every
 * other browser keeps the ordinary page it has now.
 */
export default function PageScroll({ children }: { children: ReactNode }) {
    const [usable, setUsable] = useState(
        () =>
            typeof window !== "undefined" &&
            supportsHtmlInCanvas() &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );

    useEffect(() => {
        if (!usable) return;

        // The page scrolls inside the component now, so the window must not
        // scroll as well or the two fight over the same gesture.
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // On the html-in-canvas path the page lives inside a <canvas>, and a
        // browser that answers the feature probe but does not lay that subtree
        // out would leave nothing on screen. Check that the content really has
        // height and hand the page back to the window if it does not.
        const check = window.setTimeout(() => {
            const scroller = document.querySelector<HTMLElement>(".page-scroller > canvas > div, .page-scroller > div");
            if (scroller && scroller.scrollHeight > window.innerHeight) return;
            setUsable(false);
        }, 400);

        return () => {
            window.clearTimeout(check);
            document.body.style.overflow = previous;
        };
    }, [usable]);

    if (!usable) return <>{children}</>;

    return (
        <ParticleScroll
            className="page-scroller h-dvh w-full"
            point={0.68}
            band={420}
            density={2}
            size={1.25}
            spread={220}
            gravity={0.35}
            drift={0.7}
            swirl={60}
            stagger={0.7}
            fade={0.85}
            settle={1.2}
            smoothing={0.6}
        >
            {children}
        </ParticleScroll>
    );
}
