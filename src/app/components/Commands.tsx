import AsciiSweep from "./canvasui/AsciiSweep";
import CommandGrid from "./CommandGrid";
import useSweepStage, { SWEEP_SECONDS } from "../hooks/useSweepStage";
import { FILTERS, FILTER_IDS, type Category } from "../command-groups";

export default function Commands() {
    const stage = useSweepStage<Category>("all", FILTER_IDS);

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
                                onClick={() => stage.select(filter.id)}
                                aria-selected={stage.active === filter.id}
                                className={`rounded-full border px-4 py-2 font-medium transition-all ${
                                    stage.active === filter.id
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
                    ref={stage.stageRef}
                    className="transition-[height] duration-500 ease-out motion-reduce:transition-none"
                    style={stage.armed ? { height: stage.height } : undefined}
                >
                    {stage.armed ? (
                        <AsciiSweep
                            className="h-full w-full"
                            index={stage.slot}
                            directional={false}
                            angle={stage.angle}
                            duration={SWEEP_SECONDS}
                            color="#ffe500"
                            charset="ascii"
                            displace={10}
                            aberration={4}
                            onSweepStart={stage.onSweepStart}
                            onSweepEnd={stage.onSweepEnd}
                            alternate={
                                <div ref={stage.panelRef[1]}>
                                    <CommandGrid category={stage.panels[1]} />
                                </div>
                            }
                        >
                            <div ref={stage.panelRef[0]}>
                                <CommandGrid category={stage.panels[0]} />
                            </div>
                        </AsciiSweep>
                    ) : (
                        <div ref={stage.panelRef[0]}>
                            <CommandGrid category={stage.active} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
