const ITEMS = [
    { label: "ZALO", color: "hover:text-[#0068ff]" },
    { label: "ZCA-JS", color: "hover:text-white" },
    { label: "NODE.JS", color: "hover:text-[#339933]" },
    { label: "MCP", color: "hover:text-white" },
    { label: "VIETQR", color: "hover:text-[#e11d48]" },
    { label: "WEBHOOK", color: "hover:text-white" },
    { label: "PROXY", color: "hover:text-[#38b2ac]" },
    { label: "CLAUDE CODE", color: "hover:text-[#d97757]" },
    { label: "OPENCLAW", color: "hover:text-white" },
    { label: "OFFICIAL ACCOUNT", color: "hover:text-[#0068ff]" },
];

function Row() {
    return (
        <div className="flex w-1/2 items-center justify-around gap-16 px-8 font-mono text-xl font-bold text-neutral-500">
            {ITEMS.map((item) => (
                <span key={item.label} className={`cursor-default transition-colors ${item.color}`}>
                    {item.label}
                </span>
            ))}
        </div>
    );
}

export default function Marquee() {
    return (
        <section className="relative overflow-hidden border-b border-line bg-surface py-10">
            <div className="absolute top-0 bottom-0 left-0 z-10 w-24 bg-gradient-to-r from-surface to-transparent" />
            <div className="absolute top-0 right-0 bottom-0 z-10 w-24 bg-gradient-to-l from-surface to-transparent" />
            <div className="flex w-[200%] animate-marquee">
                <Row />
                <Row />
            </div>
        </section>
    );
}
