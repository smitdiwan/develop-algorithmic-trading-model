import Link from "next/link";
import { BarChart3, LineChart, Plug, Target, Wallet } from "lucide-react";

const MODULES = [
  {
    href: "/markets",
    icon: <BarChart3 className="h-5 w-5" />,
    title: "LIVE MARKETS",
    desc: "Real-time crypto over a Binance WebSocket plus global indices, commodities and NSE names — every row tagged with its actual data source.",
    meta: "REAL-TIME FEEDS",
  },
  {
    href: "/picks",
    icon: <Target className="h-5 w-5" />,
    title: "ALGO PICKS",
    desc: "Live buy/sell signals computed by EMA9/21 + RSI + ATR on 4H exchange candles, with entry band, stop, target and the source of every number.",
    meta: "SIGNAL DESK",
  },
  {
    href: "/portfolio",
    icon: <Wallet className="h-5 w-5" />,
    title: "PORTFOLIO",
    desc: "Route a pick into an order, track open P&L against live marks, close positions — all persisted in Postgres.",
    meta: "PAPER BROKER",
  },
  {
    href: "/connect",
    icon: <Plug className="h-5 w-5" />,
    title: "CONNECT BROKER",
    desc: "CoinDCX / Groww / Binance key vault (server-side only) and copy-paste order code so you can wire the real thing yourself.",
    meta: "INTEGRATIONS",
  },
];

export function ModuleBand() {
  return (
    <section className="border-b border-[#D9D1C0] px-6 py-16 md:px-12">
      <div className="num mb-8 flex flex-wrap items-center justify-between gap-3 text-[11px] tracking-[0.3em] text-[#79715F]">
        <span className="flex items-center gap-3">
          <span className="text-[#1C6B4A]">00</span>
          <span className="h-px w-10 bg-[#D9D1C0]" />
          TERMINAL MODULES
        </span>
        <span className="text-[#8A8272]">FOUR SURFACES · ONE ENGINE</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="card card-hover group flex flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex border border-[#1C6B4A]/40 bg-[#1C6B4A]/10 p-2.5 text-[#1C6B4A] transition-colors group-hover:bg-[#1C6B4A] group-hover:text-[#F2EEE3]">
                {m.icon}
              </div>
              <span className="num text-[8.5px] tracking-[0.2em] text-[#8A8272]">{m.meta}</span>
            </div>
            <div className="num mb-2 text-[12px] font-bold tracking-[0.2em] text-[#1C1A13]">{m.title}</div>
            <p className="text-[12.5px] leading-relaxed text-[#5A5344]">{m.desc}</p>
            <div className="num mt-4 flex items-center gap-2 text-[10px] tracking-[0.2em] text-[#1C6B4A]">
              <LineChart className="h-3.5 w-3.5" />
              OPEN MODULE →
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
