import { AppNav } from "@/components/nav/AppNav";
import { Hero } from "@/components/alpha/Hero";
import { TickerTape } from "@/components/alpha/TickerTape";
import { Lab } from "@/components/alpha/Lab";
import { Methodology } from "@/components/alpha/Methodology";
import { Footer } from "@/components/alpha/Footer";
import { ModuleBand } from "@/components/nav/ModuleBand";

export default function Home() {
  return (
    <main className="grid-bg relative min-h-screen">
      <AppNav />
      <Hero />
      <TickerTape />
      <ModuleBand />
      <Lab />
      <Methodology />
      <Footer />
    </main>
  );
}
