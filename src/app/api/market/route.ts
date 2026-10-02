import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market/quotes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getQuotes();
    return NextResponse.json(data);
  } catch (err) {
    console.error("market feed failed", err);
    return NextResponse.json({ quotes: [], ts: Date.now(), liveCount: 0 }, { status: 500 });
  }
}
