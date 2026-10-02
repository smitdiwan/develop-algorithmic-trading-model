import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/alpha/Footer";
import { PageHeader } from "@/components/nav/PageHeader";
import { PicksBoard } from "@/components/picks/PicksBoard";

export const metadata = {
  title: "Algo Picks — ALPHAFORGE",
  description: "Live buy/sell signals with entry, stop, target and full source attribution.",
};

const DESKS = [
  { name: "CoinDCX Research", url: "https://coindcx.com/blog/", tag: "IN-MARKET" },
  { name: "Groww Learn", url: "https://groww.in/learn/", tag: "EQUITIES" },
  { name: "TradingView Ideas", url: "https://www.tradingview.com/ideas/", tag: "COMMUNITY" },
  { name: "Cointelegraph Analysis", url: "https://cointelegraph.com/tags/analysis", tag: "CRYPTO" },
  { name: "Investopedia TA", url: "https://www.investopedia.com/terms/t/technicalanalysis.asp", tag: "METHOD" },
  { name: "Binance Data", url: "https://www.binance.com/en/markets", tag: "RAW FEED" },
];

export default function PicksPage() {
  return (
    <main className="grid-bg min-h-screen">
      <AppNav />
      <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-12">
        <PageHeader
          index="02"
          accent="SIGNAL DESK"
          title="Picks, with receipts."
          blurb="Each signal is computed live by EMA 9/21 crossover confirmed with RSI(14), risk-geometry sized by ATR(14) on 4H exchange candles. Every card states the model, the data endpoint and the venue — no anonymous tips."
        />
        <PicksBoard />

        {/* where the research comes from */}
        <div className="mt-12">
          <div className="num mb-4 text-[10px] tracking-[0.3em] text-[#79715F]">
            REFERENCE DESKS · WHERE TO CROSS-CHECK EVERY CALL
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DESKS.map((d) => (
              <a
                key={d.name}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="card card-hover flex items-center justify-between p-4"
              >
                <div>
                  <div className="num text-[11px] font-bold tracking-[0.15em] text-[#1C1A13]">{d.name}</div>
                  <div className="num mt-0.5 text-[9px] tracking-[0.15em] text-[#8A8272]">{d.tag}</div>
                </div>
                <span className="num text-[10px] tracking-[0.15em] text-[#1C6B4A]">OPEN →</span>
              </a>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
