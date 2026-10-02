"use client";

import type { WeeklyPoint } from "@/lib/quant/types";
import { fmtPct } from "@/lib/format";

function cellStyle(ret: number, target: number): { bg: string; border: string } {
  const cap = 0.03;
  if (ret >= target) {
    const i = Math.min(1, ret / cap);
    return { bg: `rgba(28,107,73,${0.35 + 0.55 * i})`, border: "rgba(28,107,73,0.65)" };
  }
  if (ret >= 0) {
    const i = Math.min(1, ret / cap);
    return { bg: `rgba(28,107,73,${0.08 + 0.22 * i})`, border: "rgba(28,107,73,0.22)" };
  }
  const i = Math.min(1, Math.abs(ret) / cap);
  return { bg: `rgba(194,65,59,${0.1 + 0.42 * i})`, border: "rgba(194,65,59,0.35)" };
}

export function Heatmap({ weekly, target }: { weekly: WeeklyPoint[]; target: number }) {
  const rows: WeeklyPoint[][] = [];
  for (let i = 0; i < weekly.length; i += 52) rows.push(weekly.slice(i, i + 52));

  return (
    <div>
      <div className="num mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-[0.2em] text-[#79715F]">
        <span>WEEKLY CONSISTENCY MATRIX</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 border border-[#1C6B4A]/70 bg-[#1C6B4A]/60" />≥ TARGET {fmtPct(target, 1, false)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 border border-[#1C6B4A]/25 bg-[#1C6B4A]/15" />0 → TARGET
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 border border-[#C2413B]/40 bg-[#C2413B]/30" />NEGATIVE
          </span>
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center gap-1.5">
            <span className="num w-7 shrink-0 text-[9px] text-[#79715F]">Y{ri + 1}</span>
            <div
              className="grid flex-1 gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${Math.max(13, row.length)}, minmax(0,1fr))` }}
            >
              {row.map((w) => {
                const s = cellStyle(w.ret, target);
                return (
                  <div
                    key={w.label}
                    title={`${w.label} · ${w.start} → ${w.end}\nReturn: ${fmtPct(w.ret)}`}
                    className="aspect-square w-full cursor-crosshair rounded-[1px] border transition-transform hover:scale-125"
                    style={{ backgroundColor: s.bg, borderColor: s.border }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
