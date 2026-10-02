import { makeRng } from "./prng";
import type { AssetDef, Candle } from "./types";

/**
 * Synthetic market universe.
 *
 * Each asset follows a regime-switching jump-diffusion with EWMA
 * volatility clustering and a shared market factor, so correlations,
 * fat tails and vol regimes behave like real traded markets. The seed
 * makes every path deterministic and shareable.
 */

export const ASSET_DEFS: AssetDef[] = [
  { symbol: "EQX", name: "Equity Index 500", assetClass: "Equities", drift: 0.115, vol: 0.16, beta: 1.0, startPrice: 512.4, baseVolume: 2_400_000 },
  { symbol: "TEC", name: "Tech Growth 100", assetClass: "Equities", drift: 0.155, vol: 0.24, beta: 1.28, startPrice: 318.9, baseVolume: 1_700_000 },
  { symbol: "GLD", name: "Gold Trust", assetClass: "Commodities", drift: 0.075, vol: 0.145, beta: 0.08, startPrice: 224.1, baseVolume: 900_000 },
  { symbol: "BDX", name: "Aggregate Bonds", assetClass: "Fixed Income", drift: 0.056, vol: 0.066, beta: -0.14, startPrice: 92.6, baseVolume: 1_100_000 },
  { symbol: "OIL", name: "Crude Energy", assetClass: "Commodities", drift: 0.1, vol: 0.3, beta: 0.32, startPrice: 74.3, baseVolume: 620_000 },
  { symbol: "BTX", name: "Digital Asset", assetClass: "Crypto", drift: 0.6, vol: 0.5, beta: 0.52, startPrice: 64210, baseVolume: 210_000 },
];

export function assetDef(symbol: string): AssetDef {
  const def = ASSET_DEFS.find((a) => a.symbol === symbol);
  if (!def) throw new Error(`Unknown symbol: ${symbol}`);
  return def;
}

/** Markov regimes: bull / bear / chop — sticky, ~83 trading-day half-life. */
const REGIMES = [
  { driftMult: 1.6, volMult: 0.75 },
  { driftMult: -1.15, volMult: 1.45 },
  { driftMult: 0.2, volMult: 0.95 },
] as const;

function nextRegime(cur: number, u: number): number {
  const stay = 0.988;
  if (u < stay) return cur;
  const other = (u - stay) / (1 - stay);
  // Asymmetric reversion toward bull so long-run drift ≈ base drift
  // (≈ 55% bull / 22% bear / 23% chop in steady state).
  if (cur === 0) return other < 0.3 ? 1 : 2;
  if (cur === 1) return other < 0.78 ? 0 : 2;
  return other < 0.65 ? 0 : 1;
}

interface SimPath {
  rets: number[];
  marketRets: number[];
}

function simulateReturns(def: AssetDef, seed: number, n: number, marketRets: number[]): number[] {
  const rng = makeRng(seed, `asset:${def.symbol}`);
  let regime = Math.floor(rng.rand() * 3) % 3;

  // EWMA variance of standardised innovations (RiskMetrics λ=0.92) → vol clustering
  let ewmaVar = 1;
  const rets = new Array<number>(n);
  const dayDriftBase = def.drift / 252;
  const dayVolBase = def.vol / Math.sqrt(252);

  for (let t = 0; t < n; t++) {
    regime = nextRegime(regime, rng.rand());
    const r = REGIMES[regime] ?? REGIMES[2];

    const z = rng.norm() * Math.sqrt(ewmaVar);
    ewmaVar = 0.92 * ewmaVar + 0.08 * z * z;

    // Market component (already a return) + idiosyncratic component
    const idioVol = dayVolBase * Math.sqrt(Math.max(0.05, 1 - Math.min(0.9, def.beta * def.beta) * 0.55));
    let ret = def.beta * (marketRets[t] ?? 0) + idioVol * r.volMult * z * 0.62 + dayDriftBase * r.driftMult;

    // Jump diffusion: ~0.9% chance of a ±2.5σ–5.5σ gap (earnings, macro shocks)
    if (rng.rand() < 0.009) {
      const jumpDir = rng.rand() < 0.58 ? -1 : 1;
      ret += jumpDir * (2.5 + rng.rand() * 3) * idioVol;
    }
    rets[t] = ret;
  }

  // Mild AR(1) smoothing → positive short-horizon autocorrelation,
  // the structure that makes multi-week regimes tradeable.
  let prev = rets[0] ?? 0;
  for (let t = 1; t < n; t++) {
    const cur = rets[t] ?? 0;
    rets[t] = 0.9 * cur + 0.1 * prev;
    prev = rets[t] ?? 0;
  }
  return rets;
}

function simulateMarketFactor(seed: number, n: number): number[] {
  const rng = makeRng(seed, "market-factor");
  let regime = Math.floor(rng.rand() * 3) % 3;
  let ewmaVar = 1;
  const out = new Array<number>(n);
  const dayVol = 0.115 / Math.sqrt(252);
  for (let t = 0; t < n; t++) {
    regime = nextRegime(regime, rng.rand());
    const r = REGIMES[regime] ?? REGIMES[2];
    const z = rng.norm() * Math.sqrt(ewmaVar);
    ewmaVar = 0.92 * ewmaVar + 0.08 * z * z;
    out[t] = (0.095 / 252) * r.driftMult + dayVol * r.volMult * z;
  }
  return out;
}

/** Business-day calendar ending at `endDate`, length n. */
export function tradingCalendar(n: number, endDate = new Date()): string[] {
  const days: string[] = [];
  const d = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  while (days.length < n) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      days.unshift(d.toISOString().slice(0, 10));
    }
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return days;
}

function buildCandles(def: AssetDef, rets: number[], dates: string[], seed: number): Candle[] {
  const rng = makeRng(seed, `ohlc:${def.symbol}`);
  const candles: Candle[] = [];
  let prevClose = def.startPrice;
  const dayVol = def.vol / Math.sqrt(252);

  for (let t = 0; t < rets.length; t++) {
    const ret = rets[t] ?? 0;
    const overnight = rng.norm() * dayVol * 0.32;
    const open = prevClose * Math.exp(overnight);
    const close = open * Math.exp(ret - overnight);

    const rangeBase = dayVol * (0.55 + rng.rand() * 0.9);
    const hi = Math.max(open, close) * Math.exp(rangeBase * rng.rand());
    const lo = Math.min(open, close) * Math.exp(-rangeBase * rng.rand());

    const rangePct = (hi - lo) / Math.max(1e-9, ((hi + lo) / 2));
    const volNoise = Math.exp(rng.norm() * 0.35);
    const volume = Math.round(def.baseVolume * (0.55 + (rangePct / (dayVol * 1.6)) * 1.4) * volNoise);

    candles.push({
      t: dates[t] ?? "",
      o: open,
      h: Math.max(hi, open, close),
      l: Math.min(lo, open, close),
      c: close,
      v: Math.max(1000, volume),
    });
    prevClose = close;
  }
  return candles;
}

export function generateUniverse(
  seed: number,
  years: number,
  symbols: string[],
): { dates: string[]; candles: Record<string, Candle[]> } {
  const n = Math.max(260, Math.round(years * 252));
  const dates = tradingCalendar(n);
  const marketRets = simulateMarketFactor(seed, n);
  const candles: Record<string, Candle[]> = {};

  for (const sym of symbols) {
    const def = assetDef(sym);
    const rets = simulateReturns(def, seed, n, marketRets);
    candles[sym] = buildCandles(def, rets, dates, seed);
  }
  return { dates, candles };
}

export const DEFAULT_UNIVERSE = ASSET_DEFS.map((a) => a.symbol);
