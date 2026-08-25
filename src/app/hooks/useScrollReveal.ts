import { useEffect } from "react";

/** Reveals every [data-reveal] element once it scrolls into view. */
export default function useScrollReveal() {
    useEffect(() => {
        const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("reveal-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 },
        );

        targets.forEach((el) => {
            el.classList.add("reveal");
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);
}
