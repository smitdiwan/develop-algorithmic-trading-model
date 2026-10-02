import { ema, rsi } from "@/lib/quant/indicators";
import type { Candle } from "@/lib/quant/types";

export interface Pick {
  id: string;
  symbol: string;
  name: string;
  side: "LONG" | "SHORT";
  entry: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfit: number;
  expectedPct: number;
  confidence: number;
  leverage: string;
  validTill: string;
  model: string;
  dataSource: string;
  venueHint: string;
  ref: string;
  live: boolean;
  generatedAt: string;
}

export const PICK_UNIVERSE = [
  { symbol: "BTCUSDT", name: "Bitcoin", ref: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", ref: "ETH" },
  { symbol: "SOLUSDT", name: "Solana", ref: "SOL" },
  { symbol: "XRPUSDT", name: "XRP", ref: "XRP" },
  { symbol: "AVAXUSDT", name: "Avalanche", ref: "AVAX" },
  { symbol: "ADAUSDT", name: "Cardano", ref: "ADA" },
] as const;

function atrOf(candles: Candle[], period = 14): number {
  let sum = 0;
  const n = candles.length;
  for (let i = Math.max(1, n - period); i < n; i++) {
    const c = candles[i]!;
    const p = candles[i - 1]!;
    sum += Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c));
  }
  return sum / Math.max(1, period);
}

/** Deterministic fallback tape if the exchange API is unreachable. */
function syntheticSeries(seedStr: string, base: number): Candle[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const out: Candle[] = [];
  let price = base;
  const start = Date.now() - 200 * 4 * 3600 * 1000;
  for (let i = 0; i < 200; i++) {
    const drift = (rnd() - 0.492) * 0.022;
    const open = price;
    const close = open * (1 + drift);
    const high = Math.max(open, close) * (1 + rnd() * 0.006);
    const low = Math.min(open, close) * (1 - rnd() * 0.006);
    out.push({
      t: new Date(start + i * 4 * 3600 * 1000).toISOString().slice(0, 10),
      o: open, h: high, l: low, c: close, v: 1000 + rnd() * 5000,
    });
    price = close;
  }
  return out;
}

async function fetchKlines(symbol: string): Promise<{ candles: Candle[]; live: boolean }> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=200`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error("bad status");
    const rows = (await res.json()) as (string | number)[][];
    const candles: Candle[] = rows.map((r) => ({
      t: new Date(Number(r[0])).toISOString().slice(0, 10),
      o: parseFloat(String(r[1])),
      h: parseFloat(String(r[2])),
      l: parseFloat(String(r[3])),
      c: parseFloat(String(r[4])),
      v: parseFloat(String(r[5])),
    }));
    if (candles.length < 60) throw new Error("short history");
    return { candles, live: true };
  } catch {
    const def = PICK_UNIVERSE.find((p) => p.symbol === symbol);
    const base = def ? basePrice(def.ref) : 100;
    return { candles: syntheticSeries(symbol, base), live: false };
  }
}

function basePrice(ref: string): number {
  const m: Record<string, number> = { BTC: 63400, ETH: 3120, SOL: 148, XRP: 0.61, AVAX: 34.2, ADA: 0.46 };
  return m[ref] ?? 100;
}

/**
 * EMA9/EMA21 trend + RSI(14) confirmation + ATR(14) risk geometry.
 * Same family as the lab's trend model, run on 4h exchange bars.
 */
export async function buildPicks(): Promise<{ picks: Pick[]; live: boolean; source: string }> {
  const results = await Promise.all(
    PICK_UNIVERSE.map(async (u) => {
      const { candles, live } = await fetchKlines(u.symbol);
      const closes = candles.map((c) => c.c);
      const fast = ema(closes, 9);
      const slow = ema(closes, 21);
      const rsiVals = rsi(closes, 14);
      const last = closes.length - 1;
      const f = fast[last];
      const s = slow[last];
      const price = closes[last]!;
      const r = rsiVals[last] ?? 50;
      if (f === undefined || s === undefined || Number.isNaN(f) || Number.isNaN(s)) return null;

      const side: Pick["side"] = f > s ? "LONG" : "SHORT";
      const atr = atrOf(candles, 14);
      const entry = price;
      const stopLoss = side === "LONG" ? entry - 1.4 * atr : entry + 1.4 * atr;
      const takeProfit = side === "LONG" ? entry + 2.4 * atr : entry - 2.4 * atr;
      const expectedPct = Math.abs((takeProfit - entry) / entry) * 100;

      // confidence: EMA separation + RSI agreement + distance from midline
      const sep = Math.min(1, Math.abs(f - s) / (atr * 1.2));
      const rsiAgree = side === "LONG" ? Math.min(1, r / 70) : Math.min(1, (100 - r) / 70);
      const confidence = Math.max(0.35, Math.min(0.97, 0.45 * sep + 0.55 * rsiAgree));

      const now = new Date();
      const valid = new Date(now.getTime() + 3 * 86400 * 1000);

      return {
        id: `${u.symbol}-${side}-${now.toISOString().slice(0, 13)}`,
        symbol: u.symbol,
        name: u.name,
        side,
        entry,
        entryLow: price - 0.35 * atr,
        entryHigh: price + 0.35 * atr,
        stopLoss,
        takeProfit,
        expectedPct,
        confidence,
        leverage: expectedPct > 9 ? "15x" : expectedPct > 5 ? "10x" : "5x",
        validTill: valid.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }),
        model: "EMA 9/21 + RSI 14 + ATR 14 (4H)",
        dataSource: live ? "Binance public REST · /api/v3/klines" : "AlphaForge synthetic tape (exchange unreachable)",
        venueHint: "BINANCE",
        ref: u.ref,
        live,
        generatedAt: now.toISOString(),
      } as Pick;
    }),
  );

  const picks = picks_filter(results);
  const live = picks.filter((p) => p.live).length === picks.length;
  return {
    picks,
    live,
    source: live ? "Binance klines · live" : "synthetic fallback",
  };
}

function picks_filter(arr: (Pick | null)[]): Pick[] {
  return arr.filter((p): p is Pick => p !== null);
}
