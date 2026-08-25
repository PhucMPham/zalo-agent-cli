import Header from "./components/Header";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Showcase from "./components/Showcase";
import Commands from "./components/Commands";
import Features from "./components/Features";
import UsageModes from "./components/UsageModes";
import Faq from "./components/Faq";
import Footer from "./components/Footer";
import useScrollReveal from "./hooks/useScrollReveal";

export default function App() {
    useScrollReveal();

    return (
        <div className="min-h-screen bg-bg font-sans text-fg">
            <Header />
            <main className="pt-20">
                <Hero />
                <Marquee />
                <Showcase />
                <Commands />
                <Features />
                <UsageModes />
                <Faq />
            </main>
            <Footer />
        </div>
    );
}
