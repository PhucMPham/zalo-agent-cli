const ZALO_BLUE = "#0068ff";

/** Chat bubble with a terminal prompt inside — messaging + CLI. */
export default function Logo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
            <path
                d="M6 3h20a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H14l-6.2 5.2A1 1 0 0 1 6 28.4V24a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"
                fill={ZALO_BLUE}
            />
            <path
                d="m11 10 4 4-4 4M17 18h5"
                fill="none"
                stroke="#fff"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
