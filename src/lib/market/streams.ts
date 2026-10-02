/**
 * Pure market-data definitions — safe for BOTH server routes and client hooks.
 * (The React hook lives in ./live.ts so server code never touches React APIs.)
 */

export interface StreamDef {
  symbol: string;
  short: string;
  name: string;
  price: number; // reference price used for seeding / fallback
}

export interface Ticker {
  price: number;
  changePct: number; // 24h
  live: boolean;
}

export type TickerMap = Record<string, Ticker>;

export const CRYPTO_STREAMS: StreamDef[] = [
  { symbol: "BTCUSDT", short: "BTC", name: "Bitcoin", price: 63400 },
  { symbol: "ETHUSDT", short: "ETH", name: "Ethereum", price: 3120 },
  { symbol: "SOLUSDT", short: "SOL", name: "Solana", price: 148 },
  { symbol: "XRPUSDT", short: "XRP", name: "Ripple", price: 0.61 },
  { symbol: "BNBUSDT", short: "BNB", name: "BNB", price: 585 },
  { symbol: "DOGEUSDT", short: "DOGE", name: "Dogecoin", price: 0.128 },
  { symbol: "ADAUSDT", short: "ADA", name: "Cardano", price: 0.46 },
  { symbol: "AVAXUSDT", short: "AVAX", name: "Avalanche", price: 34.2 },
];

export function wsUrlFor(symbols: string[]): string {
  const streams = symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join("/");
  return `wss://stream.binance.com:9443/stream?streams=${streams}`;
}

export function anyLive(map: TickerMap): boolean {
  return Object.values(map).some((t) => t.live);
}
