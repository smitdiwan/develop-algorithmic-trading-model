"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Globe2, Radio, Search } from "lucide-react";
import { CRYPTO_STREAMS, useLiveTickers, anyLive } from "@/lib/market/live";
import { fmtPct, fmtPrice } from "@/lib/format";

interface Quote {
  symbol: string;
  name: string;
  klass: "CRYPTO" | "EQUITY" | "COMMODITY" | "FX";
  price: number;
  changePct: number;
  venue: string;
  live: boolean;
}

const CHIPS = ["ALL", "CRYPTO", "EQUITY", "COMMODITY", "FX"] as const;

export function MarketsTable() {
  const cryptoSymbols = useMemo(() => CRYPTO_STREAMS.map((c) => c.symbol), []);
  const live = useLiveTickers(cryptoSymbols);
  const [serverQuotes, setServerQuotes] = useState<Quote[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("ALL");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/market");
        const json = (await res.json()) as { quotes?: Quote[]; liveCount?: number };
        if (!cancelled && json.quotes) {
          setServerQuotes(json.quotes);
          setLiveCount(json.liveCount ?? 0);
        }
      } catch {
        /* keep last snapshot */
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // merge: WS wins for crypto, server snapshot for everything else
  const rows: Quote[] = serverQuotes.map((s) => {
    if (s.klass === "CRYPTO") {
      const t = live[s.symbol];
      if (t) return { ...s, price: t.price, changePct: t.changePct, live: t.live };
    }
    return s;
  });

  const cryptoLive = anyLive(live) || liveCount > 0;
  const filtered = rows.filter((r) => {
    const matchesChip = chip === "ALL" || r.klass === chip;
    const text = (r.symbol + " " + r.name).toLowerCase();
    return matchesChip && text.includes(q.toLowerCase().trim());
  });

  return (
    <div className="space-y-6">
      {/* feed status */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="card p-4">
          <div className="num flex items-center gap-2 text-[9px] tracking-[0.22em] text-[#79715F]">
            <Radio className="h-3 w-3 text-[#1C6B4A]" /> CRYPTO FEED
          </div>
          <div className={`num mt-2 text-lg font-bold ${cryptoLive ? "text-[#1C6B4A]" : "text-[#A3722A]"}`}>
            {cryptoLive ? "BINANCE WEBSOCKET" : "LOCAL TAPE"}
          </div>
          <div className="num mt-1 text-[9px] text-[#8A8272]">wss://stream.binance.com · no key required</div>
        </div>
        <div className="card p-4">
          <div className="num flex items-center gap-2 text-[9px] tracking-[0.22em] text-[#79715F]">
            <Globe2 className="h-3 w-3 text-[#0E7C86]" /> GLOBAL FEED
          </div>
          <div className={`num mt-2 text-lg font-bold ${liveCount > 0 ? "text-[#1C6B4A]" : "text-[#A3722A]"}`}>
            {liveCount > 0 ? `${liveCount} LIVE SOURCES` : "SEEDED SNAPSHOT"}
          </div>
          <div className="num mt-1 text-[9px] text-[#8A8272]">Stooq CSV · indices, commodities, NSE</div>
        </div>
        <div className="card p-4">
          <div className="num flex items-center gap-2 text-[9px] tracking-[0.22em] text-[#79715F]">
            <Activity className="h-3 w-3 text-[#A3722A]" /> REFRESH
          </div>
          <div className="num mt-2 text-lg font-bold text-[#1C1A13]">1s / 15s / 30s</div>
          <div className="num mt-1 text-[9px] text-[#8A8272]">stream · REST reconcile · snapshot</div>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 border border-[#D9D1C0] bg-[#F2EEE3] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[#79715F]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="filter instruments…"
            className="num w-48 bg-transparent text-[11px] tracking-wide text-[#1C1A13] outline-none placeholder:text-[#8A8272]"
          />
        </div>
        <div className="num flex flex-wrap gap-1.5 text-[10px]">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => setChip(c)}
              className={`border px-3 py-1.5 tracking-[0.15em] transition-all ${
                chip === c
                  ? "border-[#1C6B4A] bg-[#1C6B4A]/10 text-[#1C6B4A]"
                  : "border-[#D9D1C0] text-[#79715F] hover:border-[#B4A98E]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="card overflow-hidden">
        <div className="num grid grid-cols-[1.4fr_2fr_1.2fr_1fr_0.9fr] gap-3 border-b border-[#D9D1C0] bg-[#F2EEE3] px-4 py-3 text-[9px] tracking-[0.18em] text-[#79715F] md:px-6">
          <span>SYMBOL</span>
          <span className="hidden sm:block">NAME</span>
          <span className="text-right">LAST</span>
          <span className="text-right">24H</span>
          <span className="text-right">SOURCE</span>
        </div>
        <div className="divide-y divide-[#E6E0D2]">
          {filtered.map((r) => {
            const up = r.changePct >= 0;
            return (
              <div
                key={r.klass + r.symbol}
                className="num grid grid-cols-[1.4fr_2fr_1.2fr_1fr_0.9fr] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#1C6B4A]/[0.04] md:px-6"
              >
                <span className="font-bold text-[#1C1A13]">{r.symbol}</span>
                <span className="hidden truncate text-[#5A5344] sm:block">{r.name}</span>
                <span className="text-right text-[#1C1A13]">{fmtPrice(r.price)}</span>
                <span className={`text-right font-semibold ${up ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>
                  {fmtPct(r.changePct / 100, 2)}
                </span>
                <span className="text-right">
                  <span
                    className={`inline-block border px-1.5 py-0.5 text-[8px] tracking-[0.1em] ${
                      r.live
                        ? "border-[#1C6B4A]/50 bg-[#1C6B4A]/10 text-[#1C6B4A]"
                        : "border-[#A3722A]/40 bg-[#A3722A]/10 text-[#A3722A]"
                    }`}
                    title={r.live ? "Live exchange data" : "Simulated tape — feed unreachable"}
                  >
                    {r.live ? "LIVE" : "TAPE"}
                  </span>
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="num px-6 py-10 text-center text-[11px] tracking-[0.2em] text-[#79715F]">
              NO INSTRUMENTS MATCH “{q.toUpperCase()}”
            </div>
          )}
        </div>
      </div>

      <p className="num text-[9.5px] leading-relaxed text-[#8A8272]">
        EVERY ROW DECLARES ITS SOURCE. CRYPTO PRICES ARE PULLED FROM BINANCE PUBLIC ENDPOINTS;
        GLOBAL PRICES FROM STOOQ CSV. WHEN AN ENDPOINT IS UNREACHABLE THE ROW IS MARKED “TAPE”
        (SIMULATED) INSTEAD OF PRETENDING TO BE LIVE.
      </p>
    </div>
  );
}
