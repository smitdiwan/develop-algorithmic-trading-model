"use client";

import { useState } from "react";
import type { TradeRec } from "@/lib/quant/types";
import { fmtMoney, fmtPct, fmtPrice } from "@/lib/format";

const reasonStyle: Record<string, string> = {
  SIGNAL: "text-[#0E7C86] border-[#0E7C86]/30 bg-[#0E7C86]/5",
  TRAILING_STOP: "text-[#A3722A] border-[#A3722A]/30 bg-[#A3722A]/5",
  KILL_SWITCH: "text-[#C2413B] border-[#C2413B]/40 bg-[#C2413B]/10",
  END_OF_DATA: "text-[#79715F] border-[#79715F]/30 bg-[#79715F]/5",
};

export function TradesTable({ trades }: { trades: TradeRec[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? trades : trades.slice(0, 24);

  if (trades.length === 0) {
    return (
      <div className="num flex h-32 items-center justify-center text-[11px] tracking-[0.2em] text-[#79715F]">
        NO EXECUTIONS IN THIS CONFIGURATION
      </div>
    );
  }

  return (
    <div>
      <div className="num mb-3 flex items-center justify-between text-[10px] tracking-[0.2em] text-[#79715F]">
        <span>EXECUTION LOG</span>
        <span>{shown.length} / {trades.length} FILLS</span>
      </div>
      <div className="scroll-thin max-h-[420px] overflow-auto border border-[#D9D1C0]">
        <table className="num w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#F2EEE3] text-left text-[9px] tracking-[0.18em] text-[#79715F]">
              {["#", "ASSET", "SIDE", "ENTRY", "EXIT", "DAYS", "NOTIONAL", "P&L", "RET", "EXIT REASON"].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-[#D9D1C0] px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} className="border-b border-[#E6E0D2] transition-colors hover:bg-[#1C6B4A]/[0.04]">
                <td className="px-3 py-2 text-[#79715F]">{String(t.id).padStart(3, "0")}</td>
                <td className="px-3 py-2 font-bold text-[#1C1A13]">{t.symbol}</td>
                <td className={`px-3 py-2 font-bold ${t.side === 1 ? "text-[#1C6B4A]" : "text-[#0E7C86]"}`}>
                  {t.side === 1 ? "LONG" : "SHORT"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[#5A5344]">
                  {t.entryDate} <span className="text-[#8A8272]">@</span> {fmtPrice(t.entryPrice)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[#5A5344]">
                  {t.exitDate} <span className="text-[#8A8272]">@</span> {fmtPrice(t.exitPrice)}
                </td>
                <td className="px-3 py-2 text-[#5A5344]">{t.holdingDays}d</td>
                <td className="px-3 py-2 text-[#5A5344]">{fmtMoney(t.notional)}</td>
                <td className={`px-3 py-2 font-semibold ${t.pnl >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>{fmtMoney(t.pnl)}</td>
                <td className={`px-3 py-2 ${t.ret >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>{fmtPct(t.ret, 1)}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block border px-1.5 py-0.5 text-[8.5px] tracking-[0.12em] ${reasonStyle[t.exitReason]}`}>
                    {t.exitReason.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {trades.length > 24 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="num mt-3 w-full border border-[#D9D1C0] py-2 text-[10px] tracking-[0.25em] text-[#79715F] transition-colors hover:border-[#1C6B4A]/50 hover:text-[#1C6B4A]"
        >
          {showAll ? "COLLAPSE LOG" : `SHOW ALL ${trades.length} FILLS`}
        </button>
      )}
    </div>
  );
}
