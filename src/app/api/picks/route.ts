import { NextResponse } from "next/server";
import { buildPicks } from "@/lib/algo/picks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await buildPicks();
    return NextResponse.json({ ...data, ts: Date.now() });
  } catch (err) {
    console.error("picks failed", err);
    return NextResponse.json({ picks: [], live: false, source: "unavailable", ts: Date.now() }, { status: 500 });
  }
}
