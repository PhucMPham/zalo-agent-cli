import { ChevronDown, TrendingDown, TrendingUp, X } from "lucide-react";
import Gauge from "./Gauge";

const ORANGE = "#ef4d23";

function TogglePill({ options, activeIndex }: { options: [string, string]; activeIndex: 0 | 1 }) {
    return (
        <div className="mt-4 flex rounded-full bg-neutral-100 p-1" style={{ fontSize: 12 }}>
            {options.map((label, i) => (
                <span
                    key={label}
                    className={
                        i === activeIndex
                            ? "flex-1 rounded-full bg-white px-3 py-1.5 text-center text-neutral-900 shadow-sm"
                            : "flex-1 rounded-full px-3 py-1.5 text-center text-neutral-500"
                    }
                >
                    {label}
                </span>
            ))}
        </div>
    );
}

function Dropdown({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-neutral-700" style={{ fontSize: 12 }}>
                {label}
            </div>
            <button
                type="button"
                className="mt-1 flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-neutral-900"
                style={{ fontSize: 13 }}
            >
                {value}
                <ChevronDown className="h-4 w-4 text-neutral-500" />
            </button>
        </div>
    );
}

function NumberField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-neutral-700" style={{ fontSize: 12 }}>
                {label}
            </div>
            <div
                className="mt-1 flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2"
                style={{ fontSize: 13 }}
            >
                <span className="text-neutral-400">#</span>
                <span className="text-neutral-900">{value}</span>
            </div>
        </div>
    );
}

function ClicksCard() {
    return (
        <div className="rounded-2xl bg-white p-5">
            <div style={{ fontSize: 13 }}>
                <span style={{ color: ORANGE }}>Clicks</span> <span className="text-neutral-500">This Month</span>
            </div>

            <div className="mt-2 flex items-center gap-2">
                <span className="text-neutral-900" style={{ fontSize: 28, fontWeight: 600 }}>
                    6,896
                </span>
                <span
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-600"
                    style={{ fontSize: 11 }}
                >
                    <TrendingDown className="h-3 w-3" />
                    -3,382 (33%)
                </span>
            </div>

            <div className="mt-1 text-neutral-500" style={{ fontSize: 11 }}>
                Compared to yesterday
            </div>

            <div className="mt-4 text-center text-neutral-600" style={{ fontSize: 12 }}>
                Month Target achieved
            </div>

            <Gauge value={92} color={ORANGE} showLabels min="389K" max="425K" />

            <TogglePill options={["Impressions", "Clicks"]} activeIndex={0} />
        </div>
    );
}

function FormCard() {
    return (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5">
            <Dropdown label="Show figures for" value="This month" />
            <Dropdown label="Compare period by" value="Month-to-date (MTD)" />
            <NumberField label="Ste targets (This month)" value="10" />
            <NumberField label="Ste targets (This year)" value="100" />

            <div className="mt-1 flex items-center gap-4" style={{ fontSize: 13 }}>
                <button type="button" className="rounded-lg px-5 py-2 text-white" style={{ backgroundColor: ORANGE }}>
                    Save
                </button>
                <button type="button" className="text-neutral-700 underline">
                    Cancel
                </button>
                <button type="button" className="ml-auto text-neutral-500" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function VideoStartsCard() {
    return (
        <div className="rounded-2xl bg-white p-5">
            <div style={{ fontSize: 13 }}>
                <span style={{ color: ORANGE }}>Video Starts</span> <span className="text-neutral-500">today</span>
            </div>

            <div className="mt-2 flex items-center gap-2">
                <span className="text-neutral-900" style={{ fontSize: 28, fontWeight: 600 }}>
                    0
                </span>
                <span
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600"
                    style={{ fontSize: 11 }}
                >
                    <TrendingUp className="h-3 w-3" />0
                </span>
            </div>

            <div className="mt-1 text-neutral-500" style={{ fontSize: 11 }}>
                Compared to yesterday
            </div>

            <Gauge value={68} color="#9ca3af" />

            <TogglePill options={["Video Clicks", "Video Starts"]} activeIndex={0} />
        </div>
    );
}

export default function DashboardPreview() {
    return (
        <div className="mx-auto w-full max-w-[880px] rounded-3xl bg-[#f5f2ee] p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                <ClicksCard />
                <FormCard />
                <VideoStartsCard />
            </div>
        </div>
    );
}
