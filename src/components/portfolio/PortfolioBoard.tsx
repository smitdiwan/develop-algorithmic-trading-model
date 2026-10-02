"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useLiveTickers } from "@/lib/market/live";
import { fmtMoney, fmtPrice, fmtPct } from "@/lib/format";

interface Order {
  id: string;
  symbol: string;
  name: string;
  side: "LONG" | "SHORT";
  qty: number;
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
  venue: string;
  source: string;
  status: "open" | "closed";
  exitPrice: number | null;
  pnl: number | null;
  createdAt: string;
  closedAt: string | null;
}

export function PortfolioBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const symbols = useMemo(() => [...new Set(orders.filter((o) => o.status === "open").map((o) => o.symbol))], [orders]);
  const live = useLiveTickers(symbols);

  const load = async () => {
    try {
      const res = await fetch("/api/orders");
      const json = (await res.json()) as { orders?: Order[] };
      setOrders(json.orders ?? []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mark = (o: Order) => live[o.symbol]?.price ?? o.price;

  const open = orders.filter((o) => o.status === "open");
  const closed = orders.filter((o) => o.status === "closed");

  const unrealised = open.reduce((sum, o) => {
    const dir = o.side === "LONG" ? 1 : -1;
    return sum + (mark(o) - o.price) * o.qty * dir;
  }, 0);
  const realised = closed.reduce((s, o) => s + (o.pnl ?? 0), 0);
  const deployed = open.reduce((s, o) => s + o.price * o.qty, 0);
  const wins = closed.filter((o) => (o.pnl ?? 0) > 0).length;

  const close = async (o: Order) => {
    setBusyId(o.id);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", id: o.id, exitPrice: mark(o) }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="card num flex h-40 items-center justify-center gap-3 text-[11px] tracking-[0.25em] text-[#79715F]">
        <Loader2 className="h-4 w-4 animate-spin text-[#1C6B4A]" /> LOADING BOOK…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: "OPEN POSITIONS", value: String(open.length), cls: "text-[#1C1A13]" },
          { label: "CAPITAL DEPLOYED", value: fmtMoney(deployed), cls: "text-[#1C1A13]" },
          { label: "UNREALISED P&L", value: fmtMoney(unrealised), cls: unrealised >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]" },
          { label: "REALISED P&L", value: fmtMoney(realised), cls: realised >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]" },
        ].map((k) => (
          <div key={k.label} className="card hud-corner px-4 py-4">
            <div className={`num text-xl font-semibold ${k.cls}`}>{k.value}</div>
            <div className="num mt-1.5 text-[8.5px] tracking-[0.2em] text-[#79715F]">{k.label}</div>
          </div>
        ))}
      </div>

      {closed.length > 0 && (
        <div className="num flex flex-wrap items-center gap-4 text-[10px] tracking-[0.18em] text-[#79715F]">
          <span>CLOSED: {closed.length}</span>
          <span className="text-[#1C6B4A]">WINS: {wins}</span>
          <span className="text-[#C2413B]">LOSSES: {closed.length - wins}</span>
          <span>
            HIT RATE: <span className="text-[#1C1A13]">{closed.length ? ((wins / closed.length) * 100).toFixed(0) : "0"}%</span>
          </span>
        </div>
      )}

      {open.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <Wallet className="h-6 w-6 text-[#8A8272]" />
          <div className="num text-[11px] tracking-[0.25em] text-[#79715F]">BOOK IS FLAT</div>
          <p className="max-w-sm text-[13px] leading-relaxed text-[#5A5344]">
            Route a signal from the picks desk and it lands here with live P&L ticking against the mark.
          </p>
          <a href="/picks" className="num border border-[#1C6B4A] px-5 py-2 text-[11px] tracking-[0.2em] text-[#1C6B4A] transition-colors hover:bg-[#1C6B4A] hover:text-[#F2EEE3]">
            OPEN PICKS DESK →
          </a>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="num w-full min-w-[820px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[#D9D1C0] bg-[#F2EEE3] text-left text-[9px] tracking-[0.18em] text-[#79715F]">
                <th className="px-4 py-3 font-medium">INSTRUMENT</th>
                <th className="px-4 py-3 font-medium">SIDE</th>
                <th className="px-4 py-3 font-medium">QTY</th>
                <th className="px-4 py-3 font-medium">ENTRY</th>
                <th className="px-4 py-3 font-medium">MARK</th>
                <th className="px-4 py-3 font-medium">VENUE</th>
                <th className="px-4 py-3 font-medium">SL / TP</th>
                <th className="px-4 py-3 text-right font-medium">P&L</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D2]">
              {open.map((o) => {
                const dir = o.side === "LONG" ? 1 : -1;
                const m = mark(o);
                const pnl = (m - o.price) * o.qty * dir;
                const pct = ((m - o.price) / o.price) * 100 * dir;
                return (
                  <tr key={o.id} className="transition-colors hover:bg-[#1C6B4A]/[0.04]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#1C1A13]">{o.symbol}</div>
                      <div className="text-[9px] text-[#79715F]">{o.name}</div>
                    </td>
                    <td className={`px-4 py-3 font-bold ${o.side === "LONG" ? "text-[#1C6B4A]" : "text-[#0E7C86]"}`}>
                      <span className="flex items-center gap-1">
                        {o.side === "LONG" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {o.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5A5344]">{o.qty}</td>
                    <td className="px-4 py-3 text-[#5A5344]">{fmtPrice(o.price)}</td>
                    <td className="px-4 py-3 text-[#1C1A13]">
                      {fmtPrice(m)}
                      <span className={`ml-2 ${pct >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>{fmtPct(pct / 100, 2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="border border-[#D9D1C0] px-1.5 py-0.5 text-[9px] text-[#79715F]">{o.venue}</span>
                    </td>
                    <td className="px-4 py-3 text-[9.5px] text-[#8A8272]">
                      {o.stopLoss ? fmtPrice(o.stopLoss) : "—"} / {o.takeProfit ? fmtPrice(o.takeProfit) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${pnl >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>
                      {fmtMoney(pnl)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => close(o)}
                        disabled={busyId === o.id}
                        className="border border-[#C2413B]/50 px-3 py-1.5 text-[9.5px] tracking-[0.15em] text-[#C2413B] transition-colors hover:bg-[#C2413B] hover:text-[#F2EEE3] disabled:opacity-50"
                      >
                        {busyId === o.id ? "…" : "CLOSE"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <div className="num mb-3 text-[10px] tracking-[0.25em] text-[#79715F]">CLOSED HISTORY · POSTGRESQL</div>
          <div className="card divide-y divide-[#E6E0D2]">
            {closed.map((o) => (
              <div key={o.id} className="num flex items-center justify-between px-4 py-3 text-[11px]">
                <span className="font-bold text-[#1C1A13]">{o.symbol}</span>
                <span className="text-[#79715F]">{o.side} · {o.qty}</span>
                <span className="text-[#8A8272]">
                  {fmtPrice(o.price)} → {o.exitPrice ? fmtPrice(o.exitPrice) : "—"}
                </span>
                <span className={`font-semibold ${(o.pnl ?? 0) >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>
                  {fmtMoney(o.pnl ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
