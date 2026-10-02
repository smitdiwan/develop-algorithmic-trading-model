import { NextResponse } from "next/server";
import { db } from "@/db";
import { backtestRuns } from "@/db/schema";
import { runBacktest } from "@/lib/quant/engine";
import { DEFAULT_UNIVERSE, assetDef } from "@/lib/quant/data";
import { strategyIds } from "@/lib/quant/strategies";
import type { BacktestParams, StrategyId } from "@/lib/quant/types";

export const dynamic = "force-dynamic";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, dflt: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : dflt;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const strategyRaw = typeof body.strategy === "string" ? body.strategy : "ensemble";
    const strategy = (strategyIds as string[]).includes(strategyRaw)
      ? (strategyRaw as StrategyId)
      : "ensemble";

    const universeRaw = Array.isArray(body.universe)
      ? body.universe.filter((s): s is string => typeof s === "string")
      : DEFAULT_UNIVERSE;
    const universe = universeRaw
      .map((s) => s.toUpperCase())
      .filter((s) => {
        try {
          assetDef(s);
          return true;
        } catch {
          return false;
        }
      });
    if (universe.length === 0) universe.push("EQX");

    const params: BacktestParams = {
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 64) : "",
      seed: Math.round(clamp(num(body.seed, Date.now() % 100000), 1, 99999999)),
      years: clamp(num(body.years, 3), 1, 6),
      initialCapital: clamp(num(body.initialCapital, 100000), 1000, 100_000_000),
      strategy,
      fast: Math.round(clamp(num(body.fast, 20), 3, 120)),
      slow: Math.round(clamp(num(body.slow, 90), 10, 250)),
      targetVol: clamp(num(body.targetVol, 0.14), 0.02, 0.5),
      maxGross: clamp(num(body.maxGross, 1.6), 0.2, 3),
      feeBps: clamp(num(body.feeBps, 2), 0, 50),
      slippageBps: clamp(num(body.slippageBps, 3), 0, 50),
      stopAtr: clamp(num(body.stopAtr, 2.5), 0, 10),
      allowShort: body.allowShort === true,
      killSwitchDD: clamp(num(body.killSwitchDD, 0.18), 0, 0.6),
      weeklyTarget: clamp(num(body.weeklyTarget, 0.01), 0, 0.2),
      universe,
    };

    if (params.fast >= params.slow) params.fast = Math.max(3, Math.round(params.slow / 3));
    if (!params.name) {
      params.name = `${strategy.toUpperCase().replace("_", " ")} · S${params.seed}`;
    }

    const result = runBacktest(params);

    // Demo/preview runs (persist=false) skip the database.
    if (body.persist === false) {
      return NextResponse.json({ id: null, result });
    }

    const [row] = await db
      .insert(backtestRuns)
      .values({
        name: params.name,
        strategy: params.strategy,
        params: result.params,
        metrics: result.metrics,
        equity: result.equity,
        benchmark: result.benchmark,
        drawdown: result.drawdown,
        weekly: result.weekly,
        trades: result.trades.slice(0, 800),
        monteCarlo: result.monteCarlo,
        candles: result.candles,
      })
      .returning({ id: backtestRuns.id });

    return NextResponse.json({ id: row?.id ?? null, result });
  } catch (err) {
    console.error("backtest failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backtest failed" },
      { status: 500 },
    );
  }
}
