"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Filter, Loader2, Plus, X } from "lucide-react";
import type { Pick } from "@/lib/algo/picks";
import { CRYPTO_STREAMS, useLiveTickers } from "@/lib/market/live";
import { fmtPct, fmtPrice } from "@/lib/format";

const VENUES = ["BINANCE", "COINDCX", "GROWW", "MEXC", "PAPER"];

export function PicksBoard() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [meta, setMeta] = useState<{ live: boolean; source: string }>({ live: false, source: "loading" });
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Pick | null>(null);

  const live = useLiveTickers(CRYPTO_STREAMS.map((c) => c.symbol));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/picks");
        const json = (await res.json()) as { picks?: Pick[]; live?: boolean; source?: string };
        if (!cancelled) {
          setPicks(json.picks ?? []);
          setMeta({ live: json.live ?? false, source: json.source ?? "unknown" });
        }
      } catch {
        if (!cancelled) setMeta({ live: false, source: "unavailable" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4 md:px-6">
        <div>
          <div className="num text-[9px] tracking-[0.25em] text-[#79715F]">SIGNAL SOURCE</div>
          <div className="num mt-1 text-[13px] font-semibold text-[#1C1A13]">{meta.source.toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 tracking-[0.15em] ${
            meta.live ? "border-[#1C6B4A]/50 bg-[#1C6B4A]/10 text-[#1C6B4A]" : "border-[#A3722A]/40 bg-[#A3722A]/10 text-[#A3722A]"
          }`}>
            <span className="blink-dot h-1.5 w-1.5 rounded-full bg-current" />
            {meta.live ? "LIVE EXCHANGE CANDLES" : "FALLBACK TAPE"}
          </span>
          <span className="num text-[10px] text-[#8A8272]">{picks.length} ACTIVE PICKS</span>
        </div>
      </div>

      {loading ? (
        <div className="card num flex h-40 items-center justify-center gap-3 text-[11px] tracking-[0.25em] text-[#79715F]">
          <Loader2 className="h-4 w-4 animate-spin text-[#1C6B4A]" /> COMPUTING SIGNALS…
        </div>
      ) : picks.length === 0 ? (
        <div className="card num flex h-40 items-center justify-center text-[11px] tracking-[0.25em] text-[#79715F]">
          NO ACTIVE SIGNALS RIGHT NOW
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {picks.map((p) => (
            <PickCard key={p.id} pick={p} mark={live[p.symbol]?.price} onOrder={() => setTicket(p)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {ticket && (
          <OrderTicket
            pick={ticket}
            mark={live[ticket.symbol]?.price}
            onClose={() => setTicket(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PickCard({ pick, mark, onOrder }: { pick: Pick; mark?: number; onOrder: () => void }) {
  const isLong = pick.side === "LONG";
  const ltp = mark ?? pick.entry;
  const dirPct = isLong ? ((ltp - pick.entry) / pick.entry) * 100 : ((pick.entry - ltp) / pick.entry) * 100;

  const min = Math.min(pick.stopLoss, pick.takeProfit);
  const max = Math.max(pick.stopLoss, pick.takeProfit);
  const range = Math.max(1e-9, max - min);
  const pct = (v: number) => ((v - min) / range) * 100;
  const ltpPct = Math.max(-4, Math.min(104, pct(ltp)));
  const slPct = pct(pick.stopLoss);
  const tpPct = pct(pick.takeProfit);
  const eLo = pct(pick.entryLow);
  const eHi = pct(pick.entryHigh);

  const [mIcon, mName] = (() => {
    const def = CRYPTO_STREAMS.find((c) => c.symbol === pick.symbol);
    return [pick.ref.charAt(0), def?.name ?? pick.name];
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-[#D9D1C0] bg-[#F2EEE3] text-sm font-bold text-[#1C1A13]">
            {mIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold tracking-tight text-[#1C1A13]">{pick.ref}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                isLong ? "bg-[#1C6B4A]/10 text-[#1C6B4A]" : "bg-[#0E7C86]/10 text-[#0E7C86]"
              }`}>
                {pick.side} {pick.leverage}
              </span>
            </div>
            <div className="num text-[10px] tracking-wide text-[#79715F]">
              {mName} · valid till {pick.validTill}
            </div>
          </div>
        </div>
        <div className="bg-[#1C6B4A]/10 px-3 py-1.5 text-right">
          <div className="text-[15px] font-bold text-[#1C6B4A]">+{pick.expectedPct.toFixed(1)}%</div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[#1C6B4A]/80">expected profit</div>
        </div>
      </div>

      {/* entry / risk geometry */}
      <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-[11px] text-[#79715F]">Stop loss</div>
          <div className="font-semibold text-[#1C1A13]">{fmtPrice(pick.stopLoss)}</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] text-[#79715F]">Entry range</div>
          <div className="font-semibold text-[#1C1A13]">{fmtPrice(pick.entryLow)} – {fmtPrice(pick.entryHigh)}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[#79715F]">Take profit</div>
          <div className="font-semibold text-[#1C1A13]">{fmtPrice(pick.takeProfit)}</div>
        </div>
      </div>

      {/* track */}
      <div className="relative mt-6 px-1 pb-7">
        <div className="relative h-1 w-full rounded-full bg-[#D9D1C0]">
          <div
            className="absolute top-1/2 h-3 w-1.5 -translate-y-1/2 rounded-full bg-[#C2413B]"
            style={{ left: `${slPct}%`, transform: "translate(-50%,-50%)" }}
          />
          <div
            className="absolute top-1/2 h-3 w-1.5 -translate-y-1/2 rounded-full bg-[#1C6B4A]"
            style={{ left: `${tpPct}%`, transform: "translate(-50%,-50%)" }}
          />
          <div
            className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#79715F]/50"
            style={{ left: `${Math.min(eLo, eHi)}%`, width: `${Math.abs(eHi - eLo)}%` }}
          />
          <div className="absolute top-1/2 -translate-x-1/2 transition-all duration-500" style={{ left: `${ltpPct}%` }}>
            <div className="mx-auto h-0 w-0 border-b-[6px] border-l-[5px] border-r-[5px] border-b-[#0E7C86] border-l-transparent border-r-transparent" />
            <div className="num mt-1 whitespace-nowrap text-center text-[10px]">
              <span className="text-[#79715F]">LTP {fmtPrice(ltp)} </span>
              <span className={dirPct >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]"}>
                {fmtPct(dirPct / 100, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* provenance — exactly where every number came from */}
      <div className="num space-y-1 border-t border-[#D9D1C0] pt-3 text-[9.5px] leading-relaxed tracking-wide text-[#79715F]">
        <div>
          <span className="text-[#8A8272]">MODEL:</span> <span className="text-[#5A5344]">{pick.model}</span>
        </div>
        <div>
          <span className="text-[#8A8272]">DATA:</span>{" "}
          <span className="text-[#5A5344]">{pick.dataSource}</span>
        </div>
        <div className="flex items-center justify-between pt-1.5">
          <span>
            <span className="text-[#8A8272]">VENUE:</span> <span className="text-[#5A5344]">{pick.venueHint}</span>
          </span>
          <button
            onClick={onOrder}
            className="flex items-center gap-2 border border-[#1C6B4A] bg-[#1C6B4A] px-4 py-2 text-[11px] font-bold tracking-[0.15em] text-[#F2EEE3] transition-all hover:bg-transparent hover:text-[#1C6B4A]"
          >
            <Plus className="h-3.5 w-3.5" /> ORDER <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function OrderTicket({
  pick, mark, onClose,
}: {
  pick: Pick;
  mark?: number;
  onClose: () => void;
}) {
  const price = mark ?? pick.entry;
  const [qty, setQty] = useState("0.01");
  const [venue, setVenue] = useState("PAPER");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const notional = Number(qty) * price;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open",
          symbol: pick.symbol,
          name: pick.name,
          side: pick.side,
          qty: Number(qty),
          price,
          stopLoss: pick.stopLoss,
          takeProfit: pick.takeProfit,
          venue,
          source: `${pick.model} · ${pick.dataSource}`,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setDone(true);
      setTimeout(onClose, 1100);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#1C1A13]/35 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md p-6 sm:rounded"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="num text-[10px] tracking-[0.3em] text-[#79715F]">ORDER TICKET</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-bold text-[#1C1A13]">{pick.ref}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                pick.side === "LONG" ? "bg-[#1C6B4A]/10 text-[#1C6B4A]" : "bg-[#0E7C86]/10 text-[#0E7C86]"
              }`}>
                {pick.side}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#79715F] hover:text-[#C2413B]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="num mb-4 flex items-center justify-between border border-[#D9D1C0] bg-[#F2EEE3] px-3 py-2.5 text-[11px]">
          <span className="text-[#79715F]">MARK PRICE</span>
          <span className="font-bold text-[#1C1A13]">{fmtPrice(price)}</span>
        </div>

        <label className="num mb-1.5 block text-[10px] tracking-[0.2em] text-[#79715F]">QUANTITY</label>
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputMode="decimal"
          className="num mb-4 w-full border border-[#D9D1C0] bg-[#F2EEE3] px-3 py-2.5 text-[13px] text-[#1C1A13] outline-none focus:border-[#1C6B4A]"
        />

        <label className="num mb-1.5 block text-[10px] tracking-[0.2em] text-[#79715F]">VENUE</label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {VENUES.map((v) => (
            <button
              key={v}
              onClick={() => setVenue(v)}
              className={`num border px-2.5 py-1.5 text-[10px] tracking-[0.12em] transition-all ${
                venue === v ? "border-[#1C6B4A] bg-[#1C6B4A]/10 text-[#1C6B4A]" : "border-[#D9D1C0] text-[#79715F]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="num mb-4 flex items-center justify-between border-t border-[#D9D1C0] pt-3 text-[11px]">
          <span className="text-[#79715F]">NOTIONAL</span>
          <span className="font-bold text-[#1C1A13]">
            ${Number.isFinite(notional) ? notional.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
          </span>
        </div>

        {venue !== "PAPER" && (
          <p className="num mb-4 text-[9.5px] leading-relaxed text-[#A3722A]">
            ROUTED AS A STORED ORDER — LIVE EXCHANGE EXECUTION REQUIRES YOUR API KEY ON THE CONNECT PAGE.
          </p>
        )}

        {err && <p className="num mb-3 text-[11px] text-[#C2413B]">{err}</p>}

        <button
          onClick={submit}
          disabled={busy || done || !(Number(qty) > 0)}
          className={`flex w-full items-center justify-center gap-2 py-3.5 text-[12px] font-bold tracking-[0.25em] transition-all ${
            done
              ? "bg-[#1C6B4A]/15 text-[#1C6B4A]"
              : "bg-[#1C6B4A] text-[#F2EEE3] hover:bg-[#14553a] disabled:opacity-50"
          }`}
        >
          {done ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> ORDER ROUTED
            </>
          ) : busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> SENDING…
            </>
          ) : (
            <>
              <Filter className="h-4 w-4" /> CONFIRM {pick.side}
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
