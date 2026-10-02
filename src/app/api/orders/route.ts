import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error("list orders failed", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "close") {
      const id = String(body.id ?? "");
      const exitPrice = Number(body.exitPrice ?? 0);
      const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

      const dir = existing.side === "LONG" ? 1 : -1;
      const pnl = (exitPrice - existing.price) * existing.qty * dir;
      const [updated] = await db
        .update(orders)
        .set({ status: "closed", exitPrice, pnl, closedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      return NextResponse.json({ order: updated });
    }

    const symbol = String(body.symbol ?? "").toUpperCase();
    const side = body.side === "SHORT" ? "SHORT" : "LONG";
    const qty = Number(body.qty ?? 0);
    const price = Number(body.price ?? 0);
    if (!symbol || !(qty > 0) || !(price > 0)) {
      return NextResponse.json({ error: "symbol, qty and price are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(orders)
      .values({
        symbol,
        name: String(body.name ?? symbol),
        side,
        qty,
        price,
        stopLoss: body.stopLoss != null ? Number(body.stopLoss) : null,
        takeProfit: body.takeProfit != null ? Number(body.takeProfit) : null,
        venue: String(body.venue ?? "PAPER"),
        source: String(body.source ?? "manual"),
      })
      .returning();

    return NextResponse.json({ order: created });
  } catch (err) {
    console.error("order failed", err);
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}
