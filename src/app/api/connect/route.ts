import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { connections } from "@/db/schema";

export const dynamic = "force-dynamic";

const mask = (s: string) => (s.length <= 6 ? "••••" : `${s.slice(0, 3)}${"•".repeat(6)}${s.slice(-3)}`);

export async function GET() {
  try {
    const rows = await db.select().from(connections);
    return NextResponse.json({
      connections: rows.map((r) => ({
        id: r.id,
        venue: r.venue,
        apiKeyMasked: mask(r.apiKey),
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("list connections failed", err);
    return NextResponse.json({ connections: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "disconnect" && body.id) {
      await db.delete(connections).where(eq(connections.id, String(body.id)));
      return NextResponse.json({ ok: true });
    }

    const venue = String(body.venue ?? "").toUpperCase();
    const apiKey = String(body.apiKey ?? "").trim();
    const secret = String(body.secret ?? "").trim();
    if (!venue || !apiKey || !secret) {
      return NextResponse.json({ error: "venue, apiKey and secret are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(connections)
      .values({ venue, apiKey, secret })
      .returning({ id: connections.id, venue: connections.venue, status: connections.status });

    return NextResponse.json({
      connection: {
        id: created?.id,
        venue: created?.venue,
        apiKeyMasked: mask(apiKey),
        status: created?.status,
      },
    });
  } catch (err) {
    console.error("connect failed", err);
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}
