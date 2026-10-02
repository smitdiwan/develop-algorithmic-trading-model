import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { backtestRuns } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: backtestRuns.id,
        name: backtestRuns.name,
        strategy: backtestRuns.strategy,
        params: backtestRuns.params,
        metrics: backtestRuns.metrics,
        createdAt: backtestRuns.createdAt,
      })
      .from(backtestRuns)
      .orderBy(desc(backtestRuns.createdAt))
      .limit(40);
    return NextResponse.json({ runs: rows });
  } catch (err) {
    console.error("list runs failed", err);
    return NextResponse.json({ error: "Failed to load runs" }, { status: 500 });
  }
}
