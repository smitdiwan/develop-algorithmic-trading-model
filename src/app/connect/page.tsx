import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/alpha/Footer";
import { PageHeader } from "@/components/nav/PageHeader";
import { ConnectPanel } from "@/components/connect/ConnectPanel";

export const metadata = {
  title: "Connect Broker — ALPHAFORGE",
  description: "Link CoinDCX, Groww, Binance or MEXC and take the execution code with you.",
};

export default function ConnectPage() {
  return (
    <main className="grid-bg min-h-screen">
      <AppNav />
      <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-12">
        <PageHeader
          index="04"
          accent="BROKER INTEGRATION"
          title="Wire it to the real thing."
          blurb="Store venue keys server-side (they never reach the browser), then take the signed-order code and run it yourself. This is the handoff point from research terminal to live execution."
        />
        <ConnectPanel />
      </section>
      <Footer />
    </main>
  );
}
