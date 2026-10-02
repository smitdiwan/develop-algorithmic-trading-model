"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Gauge, Target, TrendingUp } from "lucide-react";
import type { BacktestResult } from "@/lib/quant/types";
import { fmtMoney, fmtPct, fmtNum } from "@/lib/format";
import { CountUp } from "./CountUp";
import { EquityChart } from "./EquityChart";
import { CandleChart } from "./CandleChart";
import { Heatmap } from "./Heatmap";
import { Distribution } from "./Distribution";
import { FanChart } from "./FanChart";
import { TradesTable } from "./TradesTable";

function Kpi({
  label, value, format, tone = "neutral", sub,
}: {
  label: string; value: number; format: (v: number) => string;
  tone?: "neutral" | "up" | "down"; sub?: string;
}) {
  const toneCls = tone === "up" ? "text-[#1C6B4A]" : tone === "down" ? "text-[#C2413B]" : "text-[#1C1A13]";
  return (
    <div className="card hud-corner px-4 py-4">
      <div className={`num text-xl font-semibold md:text-[22px] ${toneCls}`}>
        <CountUp value={value} format={format} />
      </div>
      <div className="num mt-1.5 text-[8.5px] tracking-[0.2em] text-[#79715F]">{label}</div>
      {sub && <div className="num mt-0.5 text-[9px] text-[#8A8272]">{sub}</div>}
    </div>
  );
}

export function Results({ result, savedId }: { result: BacktestResult; savedId: string | null }) {
  const m = result.metrics;
  const mc = result.monteCarlo;
  const [tab, setTab] = useState<"equity" | "signals">("equity");
  const symbols = useMemo(() => Object.keys(result.candles), [result.candles]);
  const [symbol, setSymbol] = useState<string>(symbols[0] ?? "EQX");
  const activeSymbol = symbols.includes(symbol) ? symbol : (symbols[0] ?? "EQX");

  const finalEquity = result.equity[result.equity.length - 1]?.v ?? result.params.initialCapital;

  return (
    <div className="space-y-10">
      <div className="num flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D1C0] pb-4">
        <div className="flex items-center gap-3 text-[11px] tracking-[0.2em]">
          <span className="flex items-center gap-2 text-[#1C6B4A]">
            <span className="blink-dot h-1.5 w-1.5 rounded-full bg-[#1C6B4A]" />
            RUN COMPLETE
          </span>
          <span className="text-[#8A8272]">·</span>
          <span className="text-[#5A5344]">{result.params.name.toUpperCase()}</span>
        </div>
        <div className="text-[10px] tracking-[0.2em] text-[#79715F]">
          TAPE #{result.params.seed} · {result.params.years}Y · {symbols.length} ASSETS
          {savedId ? ` · SAVED ${savedId.slice(0, 8)}` : " · PREVIEW"}
        </div>
      </div>

      <div className="num flex flex-wrap gap-1.5 text-[9px] tracking-[0.15em]">
        {[
          `MODEL ${result.params.strategy.toUpperCase().replace("_", " ")}`,
          `VOL TGT ${(result.params.targetVol * 100).toFixed(0)}%`,
          `LEV ${result.params.maxGross.toFixed(1)}×`,
          result.params.stopAtr > 0 ? `STOP ${result.params.stopAtr.toFixed(1)} ATR` : "NO STOPS",
          result.params.killSwitchDD > 0 ? `KILL -${(result.params.killSwitchDD * 100).toFixed(0)}%` : "NO KILL-SWITCH",
          `COST ${(result.params.feeBps + result.params.slippageBps).toFixed(0)}BP/SIDE`,
          result.params.allowShort ? "LONG+SHORT" : "LONG-ONLY",
          `FAST ${result.params.fast}D / SLOW ${result.params.slow}D`,
        ].map((c) => (
          <span key={c} className="border border-[#D9D1C0] bg-[#F2EEE3] px-2 py-1 text-[#79715F]">{c}</span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card relative overflow-hidden p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#1C6B4A]/[0.06] blur-3xl" />
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="num flex items-center gap-2 text-[10px] tracking-[0.25em] text-[#79715F]">
              <Target className="h-3.5 w-3.5 text-[#1C6B4A]" />
              PROBABILITY NEXT WEEK BEATS YOUR TARGET ({fmtPct(mc.targetWeekly, 1, false)})
            </div>
            <div className="num mt-3 text-5xl font-bold text-[#1C6B4A] md:text-6xl">
              <CountUp value={mc.probAboveTarget} format={(v) => fmtPct(v, 0, false)} duration={1200} />
            </div>
            <div className="num mt-2 text-[10px] leading-relaxed text-[#8A8272]">
              block-bootstrap · {mc.sims.toLocaleString()} simulated weeks · resampled from this run's
              own daily returns
            </div>
          </div>
          <div>
            <div className="num flex items-center gap-2 text-[10px] tracking-[0.25em] text-[#79715F]">
              <TrendingUp className="h-3.5 w-3.5 text-[#0E7C86]" />
              PROBABILITY WEEK IS POSITIVE
            </div>
            <div className="num mt-3 text-5xl font-bold text-[#1C1A13] md:text-6xl">
              <CountUp value={mc.probPositive} format={(v) => fmtPct(v, 0, false)} duration={1200} />
            </div>
            <div className="num mt-2 text-[10px] text-[#8A8272]">
              full-year positive: {fmtPct(mc.probYearPositive, 0, false)}
            </div>
          </div>
          <div>
            <div className="num flex items-center gap-2 text-[10px] tracking-[0.25em] text-[#79715F]">
              <Gauge className="h-3.5 w-3.5 text-[#A3722A]" />
              WHAT {fmtPct(mc.targetWeekly, 1, false)}/WEEK DEMANDS
            </div>
            <div className="num mt-3 text-3xl font-bold text-[#1C1A13] md:text-4xl">
              {fmtPct(mc.requiredCagr, 1, false)}
              <span className="ml-2 text-sm text-[#79715F]">CAGR REQUIRED</span>
            </div>
            <div className={`num mt-2 text-[11px] ${mc.engineCagr >= mc.requiredCagr ? "text-[#1C6B4A]" : "text-[#A3722A]"}`}>
              engine delivers {fmtPct(mc.engineCagr, 1)} —{" "}
              {mc.engineCagr >= mc.requiredCagr ? "target is realistic" : "target is a stretch"}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="NET RETURN" value={m.totalReturn} format={(v) => fmtPct(v, 1)} tone={m.totalReturn >= 0 ? "up" : "down"} sub={`${fmtMoney(result.params.initialCapital)} → ${fmtMoney(finalEquity)}`} />
        <Kpi label="CAGR" value={m.cagr} format={(v) => fmtPct(v, 1)} tone={m.cagr >= 0 ? "up" : "down"} sub={`vol ${fmtPct(m.annVol, 1, false)}`} />
        <Kpi label="SHARPE RATIO" value={m.sharpe} format={(v) => fmtNum(v, 2)} tone={m.sharpe >= 1 ? "up" : m.sharpe < 0 ? "down" : "neutral"} sub={`sortino ${fmtNum(m.sortino, 2)}`} />
        <Kpi label="MAX DRAWDOWN" value={m.maxDrawdown} format={(v) => fmtPct(v, 1, false)} tone="down" sub={m.maxDDTroughDate} />
        <Kpi label="WEEKS POSITIVE" value={m.weeksWinPct} format={(v) => fmtPct(v, 0, false)} tone={m.weeksWinPct >= 0.5 ? "up" : "down"} sub={`${m.weeksTotal} weeks sampled`} />
        <Kpi label="WEEKS ≥ TARGET" value={m.weeksAboveTargetPct} format={(v) => fmtPct(v, 0, false)} tone={m.weeksAboveTargetPct >= 0.3 ? "up" : "neutral"} sub={`best ${fmtPct(m.bestWeek, 1)} / worst ${fmtPct(m.worstWeek, 1)}`} />
        <Kpi label="TRADE WIN RATE" value={m.winRate} format={(v) => fmtPct(v, 0, false)} sub={`${m.trades} fills · PF ${m.profitFactor === Infinity ? "∞" : fmtNum(m.profitFactor, 2)}`} />
        <Kpi label="AVG TRADE EDGE" value={m.expectancy} format={(v) => fmtPct(v, 2)} tone={m.expectancy >= 0 ? "up" : "down"} sub={`exposure ${fmtPct(m.exposure, 0, false)}`} />
      </div>

      <div>
        <div className="num mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {(["equity", "signals"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border px-4 py-2 text-[10px] tracking-[0.25em] transition-all ${
                  tab === t
                    ? "border-[#1C6B4A] bg-[#1C6B4A]/10 text-[#1C6B4A]"
                    : "border-[#D9D1C0] text-[#79715F] hover:text-[#5A5344]"
                }`}
              >
                {t === "equity" ? "EQUITY & DRAWDOWN" : "SIGNALS ON TAPE"}
              </button>
            ))}
          </div>
          {tab === "signals" && (
            <div className="flex gap-1.5">
              {symbols.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`num border px-2.5 py-1.5 text-[10px] transition-all ${
                    activeSymbol === s
                      ? "border-[#0E7C86] text-[#0E7C86]"
                      : "border-[#D9D1C0] text-[#79715F] hover:text-[#5A5344]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="card p-4 md:p-6">
          {tab === "equity" ? (
            <EquityChart equity={result.equity} benchmark={result.benchmark} drawdown={result.drawdown} />
          ) : (
            <CandleChart candles={result.candles[activeSymbol] ?? []} trades={result.trades} symbol={activeSymbol} />
          )}
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <div className="card p-4 md:p-6">
          <Heatmap weekly={result.weekly} target={result.params.weeklyTarget} />
        </div>
        <div className="card flex flex-col gap-8 p-4 md:p-6">
          <FanChart mc={mc} />
          <Distribution weekly={result.weekly} target={result.params.weeklyTarget} />
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <TradesTable trades={result.trades} />
      </div>

      <p className="num text-[9.5px] leading-relaxed tracking-[0.08em] text-[#8A8272]">
        SIMULATED MARKET TAPE — deterministic synthetic prices with regime switching, volatility
        clustering and jump risk. Executions include fees, slippage and financing. Past simulated
        performance does not predict future results; live markets will differ.
      </p>
    </div>
  );
}
