import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/alpha/Footer";
import { PageHeader } from "@/components/nav/PageHeader";
import { MarketsTable } from "@/components/markets/MarketsTable";

export const metadata = {
  title: "Live Markets — ALPHAFORGE",
  description: "Real-time crypto, equity, commodity and FX quotes with source attribution.",
};

export default function MarketsPage() {
  return (
    <main className="grid-bg min-h-screen">
      <AppNav />
      <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-12">
        <PageHeader
          index="01"
          accent="LIVE MARKET DATA"
          title="Every price, sourced."
          blurb="Crypto streams off a Binance WebSocket the moment it opens; indices, commodities and NSE names refresh from a server-side snapshot. When a feed dies the row says TAPE instead of faking a pulse."
        />
        <MarketsTable />
      </section>
      <Footer />
    </main>
  );
}
