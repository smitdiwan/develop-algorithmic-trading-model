"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Terminal } from "lucide-react";
import type { BacktestResult, StrategyId } from "@/lib/quant/types";
import { DEFAULT_UNIVERSE } from "@/lib/quant/data";
import { SectionHeading } from "./SectionHeading";
import { ConfigPanel } from "./ConfigPanel";
import { Results } from "./Results";
import { RunHistory } from "./RunHistory";

export interface LabConfig {
  strategy: StrategyId;
  years: number;
  initialCapital: number;
  seed: number;
  fast: number;
  slow: number;
  targetVol: number;
  maxGross: number;
  feeBps: number;
  slippageBps: number;
  stopAtr: number;
  allowShort: boolean;
  killSwitchDD: number;
  weeklyTarget: number;
  universe: string[];
}

const DEFAULT_CONFIG: LabConfig = {
  strategy: "ensemble",
  years: 4,
  initialCapital: 100000,
  seed: 42,
  fast: 20,
  slow: 100,
  targetVol: 0.22,
  maxGross: 2.2,
  feeBps: 2,
  slippageBps: 3,
  stopAtr: 3.2,
  allowShort: false,
  killSwitchDD: 0.22,
  weeklyTarget: 0.006,
  universe: DEFAULT_UNIVERSE,
};

const CONSOLE_STEPS = [
  "generating market tape · regime-switching GBM + jump diffusion",
  "calibrating indicators · EMA / ATR / z-score / donchian",
  "walking 1,000+ sessions · signals on close, execution at next open",
  "applying costs · fees, slippage, financing, trailing stops",
  "compounding equity · marking to market",
  "bootstrapping 20,000 Monte Carlo weeks",
  "scoring consistency · weekly target analysis",
];

export function Lab() {
  const [config, setConfig] = useState<LabConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [historyKey, setHistoryKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (cfg: LabConfig, persist: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setRunning(true);
    setError(null);
    setLogLines([]);
    let step = 0;
    const logTimer = setInterval(() => {
      const line = CONSOLE_STEPS[step];
      if (line) setLogLines((l) => [...l, line]);
      step++;
    }, 260);

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfg, persist }),
        signal: ac.signal,
      });
      const json = (await res.json()) as { id: string | null; result?: BacktestResult; error?: string };
      if (!res.ok || !json.result) throw new Error(json.error ?? "Backtest failed");

      clearInterval(logTimer);
      setLogLines(CONSOLE_STEPS.slice());
      await new Promise((r) => setTimeout(r, 350));

      setResult(json.result);
      setSavedId(json.id);
      if (persist) setHistoryKey((k) => k + 1);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      clearInterval(logTimer);
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Backtest failed");
      }
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listRes = await fetch("/api/runs");
        const list = (await listRes.json()) as { runs?: { id: string }[] };
        const latest = list.runs?.[0];
        if (latest && !cancelled) {
          const detRes = await fetch(`/api/runs/${latest.id}`);
          const det = (await detRes.json()) as { id: string; result: BacktestResult };
          if (!cancelled && det.result) {
            setResult(det.result);
            setSavedId(det.id);
            return;
          }
        }
      } catch {
        /* fall through to preview */
      }
      if (!cancelled) execute(DEFAULT_CONFIG, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [execute]);

  const loadRun = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      const json = (await res.json()) as { id: string; result?: BacktestResult };
      if (json.result) {
        setResult(json.result);
        setSavedId(json.id);
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      /* noop */
    }
  }, []);

  return (
    <section id="lab" className="relative px-6 py-24 md:px-12">
      <SectionHeading
        index="01"
        accent="STRATEGY LABORATORY"
        title="Forge your model."
        right={
          <div className="num text-[10px] tracking-[0.25em] text-[#79715F]">
            ENGINE: <span className="text-[#1C6B4A]">EVENT-DRIVEN</span> · COST MODEL:{" "}
            <span className="text-[#1C6B4A]">FULLY LOADED</span>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="card h-fit p-5 lg:sticky lg:top-20">
          <ConfigPanel config={config} setConfig={setConfig} onRun={() => execute(config, true)} running={running} />
        </div>

        <div ref={resultsRef} className="scroll-mt-24">
          <AnimatePresence mode="wait">
            {running ? (
              <motion.div
                key="console"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card scanline relative flex min-h-[480px] flex-col p-6"
              >
                <div className="num mb-4 flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#79715F]">
                  <Terminal className="h-3.5 w-3.5 text-[#1C6B4A]" />
                  ENGINE CONSOLE
                </div>
                <div className="num space-y-2.5 text-[12px]">
                  {logLines.map((line, i) => (
                    <motion.div key={line + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                      <span className={i === logLines.length - 1 ? "text-[#1C6B4A]" : "text-[#B4A98E]"}>
                        {i === logLines.length - 1 ? "▸" : "✓"}
                      </span>
                      <span className={i === logLines.length - 1 ? "text-[#1C1A13]" : "text-[#79715F]"}>{line}</span>
                    </motion.div>
                  ))}
                  <span className="blink-dot inline-block h-4 w-2 bg-[#1C6B4A]" />
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card num flex min-h-[300px] items-center justify-center border-[#C2413B]/40 p-8 text-[12px] tracking-[0.15em] text-[#C2413B]"
              >
                ENGINE FAULT — {error}
              </motion.div>
            ) : result ? (
              <motion.div key={"res" + (savedId ?? "preview") + String(result.params.seed)}>
                <Results result={result} savedId={savedId} />
              </motion.div>
            ) : (
              <div className="card num flex min-h-[480px] items-center justify-center text-[11px] tracking-[0.25em] text-[#79715F]">
                INITIALISING ENGINE…
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <RunHistory key={historyKey} onLoad={loadRun} activeId={savedId} />
    </section>
  );
}
