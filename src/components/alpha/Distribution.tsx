"use client";

import type { WeeklyPoint } from "@/lib/quant/types";
import { fmtPct } from "@/lib/format";

export function Distribution({ weekly, target }: { weekly: WeeklyPoint[]; target: number }) {
  const rets = weekly.map((w) => w.ret);
  if (rets.length < 4) return null;
  const lo = Math.min(...rets, -target) - 0.002;
  const hi = Math.max(...rets, target) + 0.002;
  const BINS = 26;
  const step = (hi - lo) / BINS;
  const bins = new Array<number>(BINS).fill(0);
  for (const r of rets) {
    const i = Math.min(BINS - 1, Math.max(0, Math.floor((r - lo) / step)));
    bins[i] = (bins[i] ?? 0) + 1;
  }
  const maxBin = Math.max(...bins, 1);
  const W = 100;
  const H = 100;
  const targetX = ((target - lo) / (hi - lo)) * W;
  const zeroX = ((0 - lo) / (hi - lo)) * W;

  return (
    <div>
      <div className="num mb-3 flex items-center justify-between text-[10px] tracking-[0.2em] text-[#79715F]">
        <span>WEEKLY RETURN DISTRIBUTION</span>
        <span>{rets.length} WEEKS</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-44 w-full">
        {bins.map((b, i) => {
          const x0 = (i / BINS) * W;
          const mid = lo + (i + 0.5) * step;
          const hgt = (b / maxBin) * (H - 18);
          const fill = mid >= target ? "#1C6B4A" : mid >= 0 ? "rgba(28,107,73,0.32)" : "rgba(194,65,59,0.5)";
          return (
            <rect key={i} x={x0 + 0.4} y={H - 14 - hgt} width={W / BINS - 0.8} height={hgt} fill={fill}>
              <title>{fmtPct(mid, 2)}: {b} weeks</title>
            </rect>
          );
        })}
        <line x1={zeroX} x2={zeroX} y1={4} y2={H - 12} stroke="#8A8272" strokeWidth={0.4} strokeDasharray="1.5 1.5" />
        <line x1={targetX} x2={targetX} y1={4} y2={H - 12} stroke="#1C6B4A" strokeWidth={0.5} />
        <text x={targetX + 1.2} y={8} fill="#1C6B4A" fontSize={4.4} fontFamily="monospace">
          TARGET {fmtPct(target, 1, false)}
        </text>
      </svg>
      <div className="num mt-1 flex justify-between text-[9px] text-[#79715F]">
        <span>{fmtPct(lo, 1)}</span>
        <span>0</span>
        <span>{fmtPct(hi, 1)}</span>
      </div>
    </div>
  );
}
