type GaugeProps = {
    /** 0 - 100 */
    value: number;
    color?: string;
    showLabels?: boolean;
    min?: string;
    max?: string;
};

const TICK_COUNT = 40;
const CENTER_X = 100;
const CENTER_Y = 100;
const RADIUS = 80;
const INNER_RADIUS = RADIUS - 10;

export default function Gauge({ value, color = "#ef4d23", showLabels = false, min = "", max = "" }: GaugeProps) {
    const activeCount = Math.round((value / 100) * TICK_COUNT);

    const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
        // 180 degree arc: start at PI (left) and sweep to 2PI (right).
        const angle = Math.PI + (i / (TICK_COUNT - 1)) * Math.PI;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return (
            <line
                key={i}
                x1={CENTER_X + INNER_RADIUS * cos}
                y1={CENTER_Y + INNER_RADIUS * sin}
                x2={CENTER_X + RADIUS * cos}
                y2={CENTER_Y + RADIUS * sin}
                stroke={i < activeCount ? color : "#d4d4d8"}
                strokeWidth={2.5}
                strokeLinecap="round"
            />
        );
    });

    return (
        <div className="w-full">
            <svg viewBox="0 0 200 120" className="mx-auto w-full" style={{ maxWidth: 260 }}>
                {ticks}
                <text
                    x={100}
                    y={105}
                    textAnchor="middle"
                    fontSize={22}
                    fontWeight={600}
                    fill="#0b0f1a"
                    fontFamily="Inter, sans-serif"
                >
                    {value}%
                </text>
            </svg>
            {showLabels ? (
                <div className="mx-auto flex justify-between text-neutral-500" style={{ maxWidth: 260, fontSize: 11 }}>
                    <span>{min}</span>
                    <span>{max}</span>
                </div>
            ) : null}
        </div>
    );
}
