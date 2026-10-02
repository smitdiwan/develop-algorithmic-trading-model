"use client";

import type { MonteCarloResult } from "@/lib/quant/types";
import { fmtPct } from "@/lib/format";

export function FanChart({ mc }: { mc: MonteCarloResult }) {
  const fan = mc.fan;
  if (fan.length === 0) return null;

  const req = mc.requiredCagr;
  const all = fan.flatMap((f) => [f.p5, f.p95, req]);
  let lo = Math.min(...all, -0.02);
  let hi = Math.max(...all, 0.02);
  if (hi < req * 1.15) hi = req * 1.15;
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;

  const W = 100;
  const H = 100;
  const x = (week: number) => ((week - 1) / (fan.length - 1)) * (W - 4) + 2;
  const y = (v: number) => H - 10 - ((v - lo) / (hi - lo)) * (H - 16);

  const band = (a: keyof (typeof fan)[0], b: keyof (typeof fan)[0], fill: string, opacity: number) => {
    const top = fan.map((f, i) => `${i === 0 ? "M" : "L"}${x(f.week).toFixed(2)},${y(f[a] as number).toFixed(2)}`).join(" ");
    const bottom = fan.slice().reverse().map((f) => `L${x(f.week).toFixed(2)},${y(f[b] as number).toFixed(2)}`).join(" ");
    return <path key={a + b} d={`${top} ${bottom} Z`} fill={fill} opacity={opacity} />;
  };

  const line = (k: keyof (typeof fan)[0], stroke: string, width: number, dash?: string, key?: string) => (
    <path
      key={key}
      d={fan.map((f, i) => `${i === 0 ? "M" : "L"}${x(f.week).toFixed(2)},${y(f[k] as number).toFixed(2)}`).join(" ")}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );

  const reqPath = `M${x(1).toFixed(2)},${y(0).toFixed(2)} L${x(fan.length).toFixed(2)},${y(req).toFixed(2)}`;

  return (
    <div>
      <div className="num mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-[0.2em] text-[#79715F]">
        <span>52-WEEK MONTE CARLO FAN · 1,500 PATHS</span>
        <span className="flex gap-4">
          <span className="text-[#1C6B4A]">— MEDIAN</span>
          <span className="text-[#0E7C86]">-- REQUIRED</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-56 w-full md:h-64">
        {band("p5", "p95", "#1C6B4A", 0.06)}
        {band("p25", "p75", "#1C6B4A", 0.13)}
        {line("p50", "#1C6B4A", 0.7, undefined, "med")}
        {line("p5", "rgba(194,65,59,0.7)", 0.35, "1.4 1.4", "p5")}
        {line("p95", "rgba(28,107,73,0.5)", 0.35, "1.4 1.4", "p95")}
        <path d={reqPath} fill="none" stroke="#0E7C86" strokeWidth={0.5} strokeDasharray="2.2 1.6" />
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="rgba(138,130,113,0.5)" strokeWidth={0.3} />
        <text x={W - 1} y={y(req) - 1.5} fill="#0E7C86" fontSize={4.2} fontFamily="monospace" textAnchor="end">
          {fmtPct(req, 0, false)} REQ
        </text>
      </svg>
      <div className="num mt-1 flex justify-between text-[9px] text-[#79715F]">
        <span>NOW</span><span>W13</span><span>W26</span><span>W39</span><span>W52</span>
      </div>
    </div>
  );
}
