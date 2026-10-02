"use client";

import { Activity, Crosshair, Dices, Layers, Sigma, TrendingUp, Waves } from "lucide-react";
import { ASSET_DEFS } from "@/lib/quant/data";
import { STRATEGY_META } from "@/lib/quant/strategies";
import type { StrategyId } from "@/lib/quant/types";
import type { LabConfig } from "./Lab";

const strategyIcons: Record<StrategyId, React.ReactNode> = {
  trend: <TrendingUp className="h-4.5 w-4.5" />,
  mean_reversion: <Waves className="h-4.5 w-4.5" />,
  breakout: <Crosshair className="h-4.5 w-4.5" />,
  ensemble: <Layers className="h-4.5 w-4.5" />,
};

const presets: { label: string; apply: Partial<LabConfig> }[] = [
  { label: "DEFENSIVE", apply: { targetVol: 0.12, maxGross: 1.2, killSwitchDD: 0.12, stopAtr: 4.0, allowShort: false } },
  { label: "BALANCED", apply: { targetVol: 0.22, maxGross: 2.2, killSwitchDD: 0.22, stopAtr: 3.2, allowShort: false } },
  { label: "AGGRESSIVE", apply: { targetVol: 0.35, maxGross: 2.5, killSwitchDD: 0.28, stopAtr: 2.4, allowShort: true } },
];

function SliderField({
  label, value, min, max, step, format, hint, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; hint?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="num flex items-baseline justify-between text-[10px] tracking-[0.18em]">
        <span className="text-[#5A5344]">{label}</span>
        <span className="text-[#1C6B4A]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
      />
      {hint && <div className="num mt-1 text-[9px] text-[#8A8272]">{hint}</div>}
    </div>
  );
}

const pct1 = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1s = (v: number) => `${(v * 100).toFixed(1)}%`;

export function ConfigPanel({
  config, setConfig, onRun, running,
}: {
  config: LabConfig;
  setConfig: (c: LabConfig) => void;
  onRun: () => void;
  running: boolean;
}) {
  const set = <K extends keyof LabConfig>(k: K, v: LabConfig[K]) => setConfig({ ...config, [k]: v });

  return (
    <div className="space-y-8">
      <div>
        <div className="num mb-3 text-[10px] tracking-[0.25em] text-[#79715F]">01 · ALLOCATION MODEL</div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(STRATEGY_META) as StrategyId[]).map((id) => {
            const active = config.strategy === id;
            return (
              <button
                key={id}
                onClick={() => set("strategy", id)}
                className={`border p-3 text-left transition-all ${
                  active
                    ? "border-[#1C6B4A] bg-[#1C6B4A]/10 text-[#1C1A13]"
                    : "border-[#D9D1C0] bg-transparent text-[#79715F] hover:border-[#B4A98E] hover:text-[#5A5344]"
                }`}
              >
                <div className={`mb-1.5 ${active ? "text-[#1C6B4A]" : "text-[#8A8272]"}`}>{strategyIcons[id]}</div>
                <div className="text-[12px] font-bold tracking-wide">{STRATEGY_META[id].label.toUpperCase()}</div>
                <div className="mt-0.5 text-[10px] leading-snug opacity-70">{STRATEGY_META[id].tagline}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="num mb-3 flex items-center justify-between text-[10px] tracking-[0.25em] text-[#79715F]">
          <span>02 · TRADE UNIVERSE</span>
          <span className="text-[#8A8272]">{config.universe.length} ACTIVE</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ASSET_DEFS.map((a) => {
            const active = config.universe.includes(a.symbol);
            return (
              <button
                key={a.symbol}
                onClick={() => {
                  const next = active
                    ? config.universe.filter((s) => s !== a.symbol)
                    : [...config.universe, a.symbol];
                  if (next.length > 0) set("universe", next);
                }}
                className={`num border px-2.5 py-1.5 text-[10px] tracking-[0.12em] transition-all ${
                  active
                    ? "border-[#1C6B4A]/70 bg-[#1C6B4A]/10 text-[#1C6B4A]"
                    : "border-[#D9D1C0] text-[#79715F] hover:border-[#B4A98E]"
                }`}
                title={`${a.name} · ${a.assetClass}`}
              >
                {a.symbol}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="num mb-3 text-[10px] tracking-[0.25em] text-[#79715F]">03 · RISK REGIME</div>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setConfig({ ...config, ...p.apply })}
              className="num border border-[#D9D1C0] py-2 text-[10px] tracking-[0.2em] text-[#5A5344] transition-all hover:border-[#1C6B4A]/60 hover:text-[#1C6B4A]"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="num text-[10px] tracking-[0.25em] text-[#79715F]">04 · PARAMETERS</div>
        <SliderField label="SIGNAL WINDOW (FAST)" value={config.fast} min={5} max={60} step={1} format={(v) => `${v}D`} onChange={(v) => set("fast", Math.min(v, config.slow - 5))} />
        <SliderField label="TREND WINDOW (SLOW)" value={config.slow} min={30} max={200} step={5} format={(v) => `${v}D`} onChange={(v) => set("slow", Math.max(v, config.fast + 5))} />
        <SliderField label="VOL TARGET" value={config.targetVol} min={0.04} max={0.4} step={0.01} format={pct1} hint="annualised risk budget per model" onChange={(v) => set("targetVol", v)} />
        <SliderField label="LEVERAGE CAP" value={config.maxGross} min={1} max={3} step={0.1} format={(v) => `${v.toFixed(1)}×`} hint="max gross exposure vs equity" onChange={(v) => set("maxGross", v)} />
        <SliderField label="TRAILING STOP" value={config.stopAtr} min={0} max={6} step={0.1} format={(v) => (v === 0 ? "OFF" : `${v.toFixed(1)} ATR`)} onChange={(v) => set("stopAtr", v)} />
        <SliderField label="KILL-SWITCH" value={config.killSwitchDD} min={0} max={0.4} step={0.01} format={(v) => (v === 0 ? "OFF" : `-${pct1(v)} DD`)} hint="flattens book beyond this drawdown" onChange={(v) => set("killSwitchDD", v)} />
        <SliderField label="WEEKLY TARGET" value={config.weeklyTarget} min={0.002} max={0.02} step={0.001} format={(v) => pct1s(v)} hint="the consistency bar you want to beat" onChange={(v) => set("weeklyTarget", v)} />
        <SliderField label="BACKTEST LENGTH" value={config.years} min={1} max={6} step={1} format={(v) => `${v}Y`} onChange={(v) => set("years", v)} />
        <div className="grid grid-cols-2 gap-4">
          <SliderField label="FEES" value={config.feeBps} min={0} max={20} step={1} format={(v) => `${v}bp`} onChange={(v) => set("feeBps", v)} />
          <SliderField label="SLIPPAGE" value={config.slippageBps} min={0} max={20} step={1} format={(v) => `${v}bp`} onChange={(v) => set("slippageBps", v)} />
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => set("allowShort", !config.allowShort)}
          className={`num flex w-full items-center justify-between border px-3 py-2.5 text-[10px] tracking-[0.18em] transition-all ${
            config.allowShort
              ? "border-[#0E7C86]/60 bg-[#0E7C86]/10 text-[#0E7C86]"
              : "border-[#D9D1C0] text-[#79715F] hover:border-[#B4A98E]"
          }`}
        >
          <span>SHORT SELLING</span>
          <span>{config.allowShort ? "ENABLED" : "LONG-ONLY"}</span>
        </button>

        <div className="num flex items-center justify-between border border-[#D9D1C0] px-3 py-2.5 text-[10px] tracking-[0.18em]">
          <span className="text-[#79715F]">MARKET TAPE SEED</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              value={config.seed}
              onChange={(e) => set("seed", Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="w-20 bg-transparent text-right text-[#1C6B4A] outline-none"
            />
            <button
              onClick={() => set("seed", Math.floor(Math.random() * 90000) + 1)}
              className="text-[#79715F] transition-colors hover:text-[#1C6B4A]"
              title="Random seed — a different simulated history"
            >
              <Dices className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        <div className="num flex items-center justify-between border border-[#D9D1C0] px-3 py-2.5 text-[10px] tracking-[0.18em] text-[#79715F]">
          <span>INITIAL CAPITAL</span>
          <select
            value={config.initialCapital}
            onChange={(e) => set("initialCapital", Number(e.target.value))}
            className="bg-transparent text-right text-[#1C6B4A] outline-none [&>option]:bg-[#F2EEE3]"
          >
            {[25000, 100000, 250000, 1000000].map((v) => (
              <option key={v} value={v}>${v.toLocaleString()}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onRun}
        disabled={running}
        className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden border py-4 text-[12px] font-bold tracking-[0.3em] transition-all ${
          running
            ? "cursor-wait border-[#D9D1C0] bg-[#F2EEE3] text-[#79715F]"
            : "border-[#1C6B4A] bg-[#1C6B4A] text-[#F2EEE3] hover:shadow-[0_0_30px_rgba(28,107,73,0.3)]"
        }`}
      >
        {running ? (
          <>
            <Activity className="h-4 w-4 animate-pulse" />
            COMPUTING…
          </>
        ) : (
          <>
            <Sigma className="h-4 w-4" />
            RUN BACKTEST
          </>
        )}
      </button>
    </div>
  );
}
