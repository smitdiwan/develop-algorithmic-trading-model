import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { backtestRuns } from "@/db/schema";
import type { BacktestResult } from "@/lib/quant/types";
import type { Metrics, MonteCarloResult, BacktestParams } from "@/lib/quant/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const [row] = await db.select().from(backtestRuns).where(eq(backtestRuns.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result: BacktestResult = {
      params: row.params as BacktestParams,
      candles: row.candles as BacktestResult["candles"],
      equity: row.equity as BacktestResult["equity"],
      benchmark: row.benchmark as BacktestResult["benchmark"],
      drawdown: row.drawdown as BacktestResult["drawdown"],
      weekly: row.weekly as BacktestResult["weekly"],
      returns: [],
      metrics: row.metrics as Metrics,
      trades: row.trades as BacktestResult["trades"],
      monteCarlo: row.monteCarlo as MonteCarloResult,
    };
    return NextResponse.json({ id: row.id, result, createdAt: row.createdAt });
  } catch (err) {
    console.error("get run failed", err);
    return NextResponse.json({ error: "Failed to load run" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await db.delete(backtestRuns).where(eq(backtestRuns.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete run failed", err);
    return NextResponse.json({ error: "Failed to delete run" }, { status: 500 });
  }
}
