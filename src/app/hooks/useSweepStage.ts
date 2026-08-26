import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/** Seconds the ascii band takes to cross the panel. */
export const SWEEP_SECONDS = 1.4;

type PanelRef = (element: HTMLDivElement | null) => void;

/**
 * Drives the two-panel hand-off an AsciiSweep animates between.
 *
 * The sweep runs between two panels, so the values ping-pong across a pair of
 * slots: the incoming value is written to whichever slot is idle, and flipping
 * the index is what fires the sweep.
 *
 * @param initial the value both panels start on.
 * @param order   the values in the order they appear on screen, so a sweep can
 *                travel the way the eye does.
 */
export default function useSweepStage<T>(initial: T, order: readonly T[]) {
    const [slot, setSlot] = useState<0 | 1>(0);
    const [panels, setPanels] = useState<[T, T]>([initial, initial]);
    const [angle, setAngle] = useState(0);
    const [sweeping, setSweeping] = useState(false);
    const [heights, setHeights] = useState<[number, number]>([0, 0]);
    // The sweep captures both panels up front, which is a full walk of that
    // subtree on every browser without html-in-canvas. Hold it back until the
    // stage is nearly in view, so that cost never lands during page load, and
    // skip it below md, where a single-column grid is several times taller and
    // the capture costs that much more on the weakest devices.
    const [near, setNear] = useState(false);
    const [wide, setWide] = useState(false);
    const armed = near && wide;

    const active = panels[slot];
    const stageRef = useRef<HTMLDivElement>(null);
    const panelNodes = useRef<Array<HTMLDivElement | null>>([null, null]);
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

    // Both panels are absolutely positioned, so the stage has no height of its
    // own. Track each one and give the stage the height it needs — the taller of
    // the two while a sweep is in flight, so neither side is clipped.
    useLayoutEffect(() => {
        const measure = () =>
            setHeights([panelNodes.current[0]?.offsetHeight ?? 0, panelNodes.current[1]?.offsetHeight ?? 0]);

        const observer = new ResizeObserver(measure);
        panelNodes.current.forEach((element) => element && observer.observe(element));
        measure();

        return () => observer.disconnect();
    }, [armed]);

    useEffect(() => () => window.clearTimeout(sweepTimer.current), []);

    // onSweepEnd is the engine's signal, but its loop pauses when the stage
    // scrolls out of view, so a sweep left mid-flight would never report back
    // and the stage would stay stuck at the taller height. Time it out too.
    const onSweepStart = useCallback(() => {
        setSweeping(true);
        window.clearTimeout(sweepTimer.current);
        sweepTimer.current = window.setTimeout(() => setSweeping(false), SWEEP_SECONDS * 1000 + 600);
    }, []);

    const onSweepEnd = useCallback(() => {
        window.clearTimeout(sweepTimer.current);
        setSweeping(false);
    }, []);

    const select = useCallback(
        (next: T) => {
            if (next === active) return;

            setAngle(order.indexOf(next) > order.indexOf(active) ? 0 : 180);

            const target: 0 | 1 = slot === 0 ? 1 : 0;
            setPanels((prev) => (target === 0 ? [next, prev[1]] : [prev[0], next]));
            setSlot(target);
        },
        [active, order, slot],
    );

    const panelRef = useMemo<[PanelRef, PanelRef]>(
        () => [
            (element) => void (panelNodes.current[0] = element),
            (element) => void (panelNodes.current[1] = element),
        ],
        [],
    );

    return {
        active,
        angle,
        armed,
        height: (sweeping ? Math.max(heights[0], heights[1]) : heights[slot]) || undefined,
        onSweepEnd,
        onSweepStart,
        panelRef,
        panels,
        select,
        slot,
        stageRef,
    };
}
