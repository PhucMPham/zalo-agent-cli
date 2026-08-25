import { useEffect, useState, type ReactNode } from "react";
import { Liquid } from "./canvasui/Liquid";

/** Brand yellow (#FFE500) as the 0-1 RGB triple the fluid shader expects. */
const BRAND: [number, number, number] = [1, 0.898, 0];

/**
 * The fluid follows a cursor, so it is pointless on touch devices, and it is
 * motion the reduced-motion setting asks us not to render. Both start out false
 * so the first paint is the plain content either way.
 */
function useLiquidEnabled() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const fine = window.matchMedia("(pointer: fine)");
        const update = () => setEnabled(fine.matches && !reduced.matches);

        update();
        reduced.addEventListener("change", update);
        fine.addEventListener("change", update);

        return () => {
            reduced.removeEventListener("change", update);
            fine.removeEventListener("change", update);
        };
    }, []);

    return enabled;
}

/**
 * Wraps a section in Canvas UI's Liquid effect. Chrome with the HTML-in-canvas
 * flag warps the live content; everywhere else the component falls back to a
 * translucent fluid trail painted over it, and if WebGL2 is missing the effect
 * silently drops out and the children render untouched.
 */
export default function LiquidStage({ children, className }: { children: ReactNode; className?: string }) {
    const enabled = useLiquidEnabled();

    if (!enabled) {
        return <div className={className}>{children}</div>;
    }

    return (
        <Liquid
            className={className}
            color={BRAND}
            intensity={0.4}
            distortion={0.5}
            blend={3}
            force={0.85}
            radius={0.16}
            curl={2.4}
            densityDissipation={0.9}
            velocityDissipation={0.98}
        >
            {children}
        </Liquid>
    );
}
