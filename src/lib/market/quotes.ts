import { CRYPTO_STREAMS } from "@/lib/market/streams";

export interface Quote {
  symbol: string;
  name: string;
  klass: "CRYPTO" | "EQUITY" | "COMMODITY" | "FX";
  price: number;
  changePct: number;
  venue: string;
  live: boolean;
}

/** Seeds for fallback quotes when outbound network is unavailable. */
export const STOCK_SEEDS: { symbol: string; name: string; klass: Quote["klass"]; price: number; venue: string }[] = [
  { symbol: "SPX", name: "S&P 500 Index", klass: "EQUITY", price: 5738, venue: "CBOE" },
  { symbol: "NDX", name: "Nasdaq 100", klass: "EQUITY", price: 19860, venue: "NASDAQ" },
  { symbol: "DJI", name: "Dow Jones 30", klass: "EQUITY", price: 42310, venue: "NYSE" },
  { symbol: "RELIANCE", name: "Reliance Industries", klass: "EQUITY", price: 2984, venue: "NSE" },
  { symbol: "TCS", name: "Tata Consultancy", klass: "EQUITY", price: 4120, venue: "NSE" },
  { symbol: "HDFCBANK", name: "HDFC Bank", klass: "EQUITY", price: 1648, venue: "NSE" },
  { symbol: "GOLD", name: "Gold Spot", klass: "COMMODITY", price: 2648, venue: "COMEX" },
  { symbol: "XAG", name: "Silver Spot", klass: "COMMODITY", price: 31.2, venue: "COMEX" },
  { symbol: "USDINR", name: "US Dollar / Rupee", klass: "FX", price: 83.9, venue: "FXCM" },
];

const STOOQ_MAP: Record<string, string> = {
  SPX: "spx",
  NDX: "ndq",
  DJI: "dji",
  GOLD: "xauusd",
  XAG: "xagusd",
  USDINR: "usdinr",
  RELIANCE: "reliance.in",
  TCS: "tcs.in",
  HDFCBANK: "hdfcbank.in",
};

async function fetchStooq(symbol: string): Promise<number | null> {
  const code = STOOQ_MAP[symbol];
  if (!code) return null;
  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${code}&f=sd2t2ohlcv&h&e=csv`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1]!.split(",");
    const close = parseFloat(cols[cols.length - 1] ?? "");
    return Number.isFinite(close) && close > 0 ? close : null;
  } catch {
    return null;
  }
}

/**
 * Server-side quote fetcher. Live sources: Binance REST for crypto,
 * Stooq CSV for global indices/commodities. Anything unreachable falls back
 * to the seeded tape and is flagged `live:false` so the UI never lies.
 */
export async function getQuotes(): Promise<{ quotes: Quote[]; ts: number; liveCount: number }> {
  const crypto: Quote[] = CRYPTO_STREAMS.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    klass: "CRYPTO" as const,
    price: c.price,
    changePct: 0,
    venue: "BINANCE",
    live: false,
  }));

  try {
    const q = CRYPTO_STREAMS.map((s) => `"${s.symbol}"`).join(",");
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${q}]`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const rows = (await res.json()) as { symbol: string; lastPrice: string; priceChangePercent: string }[];
      for (const r of rows) {
        const hit = crypto.find((c) => c.symbol === r.symbol);
        if (hit) {
          hit.price = parseFloat(r.lastPrice);
          hit.changePct = parseFloat(r.priceChangePercent);
          hit.live = true;
        }
      }
    }
  } catch {
    /* fall back */
  }

  const stocks = await Promise.all(
    STOCK_SEEDS.map(async (s) => {
      const live = await fetchStooq(s.symbol);
      return {
        symbol: s.symbol,
        name: s.name,
        klass: s.klass,
        price: live ?? s.price,
        changePct: 0,
        venue: s.venue,
        live: live !== null,
      } as Quote;
    }),
  );

  const quotes = [...crypto, ...stocks];
  const liveCount = quotes.filter((x) => x.live).length;
  return { quotes, ts: Date.now(), liveCount };
}
