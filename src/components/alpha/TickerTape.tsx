"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { CRYPTO_STREAMS, useLiveTickers } from "@/lib/market/live";
import { fmtPct, fmtPrice } from "@/lib/format";

const HIST = 28;

function seedTape() {
  return CRYPTO_STREAMS.map((a) => {
    let p = a.price;
    const hist: number[] = [];
    for (let i = 0; i < HIST; i++) {
      hist.push(p);
      p = Math.max(0.01, p * (1 + (Math.random() - 0.48) * 0.004));
    }
    const ref = hist[0] ?? a.price;
    return { symbol: a.symbol, short: a.short, name: a.name, price: p, chg: p / ref - 1, hist };
  });
}

function Sparkline({ hist, up }: { hist: number[]; up: boolean }) {
  const lo = Math.min(...hist);
  const hi = Math.max(...hist);
  const range = Math.max(1e-9, hi - lo);
  const W = 56;
  const H = 14;
  const pts = hist
    .map((v, i) => `${((i / (hist.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - lo) / range) * (H - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={W} height={H} className="hidden md:block" aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "#1C6B4A" : "#C2413B"} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

export function TickerTape() {
  const [rows, setRows] = useState(seedTape);
  const live = useLiveTickers(CRYPTO_STREAMS.map((c) => c.symbol));

  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) =>
        prev.map((t) => {
          const livePx = live[t.symbol]?.price;
          const price = livePx ?? Math.max(0.01, t.price * (1 + (Math.random() - 0.49) * 0.0024));
          const hist = [...t.hist.slice(-(HIST - 1)), price];
          const ref = hist[0] ?? price;
          return { ...t, price, chg: price / ref - 1, hist };
        }),
      );
    }, 1100);
    return () => clearInterval(id);
  }, [live]);

  const row = rows.map((t) => {
    const up = t.chg >= 0;
    return (
      <div key={t.symbol} className="flex shrink-0 items-center gap-3 px-7">
        <span className="num text-[11px] font-bold tracking-[0.15em] text-[#1C1A13]">{t.short}</span>
        <span className="hidden text-[10px] tracking-[0.15em] text-[#79715F] lg:inline">{t.name.toUpperCase()}</span>
        <span className="num text-[11px] text-[#5A5344]">{fmtPrice(t.price)}</span>
        <Sparkline hist={t.hist} up={up} />
        <span className={`num flex items-center gap-1 text-[11px] ${up ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {fmtPct(t.chg)}
        </span>
        <span className="ml-4 h-1 w-1 rounded-full bg-[#CFC7B2]" />
      </div>
    );
  });

  return (
    <div className="relative overflow-hidden border-y border-[#D9D1C0] bg-[#E2DDCF] py-3">
      <div className="marquee-track flex w-max">
        <div className="flex">{row}</div>
        <div className="flex">{row}</div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#EAE6DC] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#EAE6DC] to-transparent" />
    </div>
  );
}
