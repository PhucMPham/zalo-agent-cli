const TOKEN = /("[^"]*"|#[^\n]*|<[A-Z_]+>|(?<=^|\s)--?[a-zA-Z][\w-]*|zalo-agent|clawhub|npm)/g;

const CLASS: Array<[RegExp, string]> = [
    [/^"/, "text-code-string"],
    [/^#/, "text-code-comment"],
    [/^</, "text-code-fn"],
    [/^-/, "text-code-keyword"],
];

function tokenClass(token: string) {
    const match = CLASS.find(([re]) => re.test(token));
    return match ? match[1] : "text-brand";
}

/** Shell snippet with light syntax colouring — no highlighter dependency. */
export default function CodeBlock({ lines, className = "" }: { lines: string[]; className?: string }) {
    return (
        <pre className={`overflow-x-auto font-mono text-xs leading-relaxed text-muted ${className}`}>
            {lines.map((line, i) => (
                <div key={i}>
                    {line.split(TOKEN).map((part, j) =>
                        j % 2 === 1 ? (
                            <span key={j} className={tokenClass(part)}>
                                {part}
                            </span>
                        ) : (
                            <span key={j}>{part}</span>
                        ),
                    )}
                </div>
            ))}
        </pre>
    );
}
