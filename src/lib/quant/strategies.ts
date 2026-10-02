import { atr, ema, momentum, rollingMaxShift, rollingMinShift, rollingStdevNaN } from "./indicators";
import type { Candle, StrategyId } from "./types";

export const STRATEGY_META: Record<
  StrategyId,
  { label: string; tagline: string; description: string }
> = {
  trend: {
    label: "Trend Momentum",
    tagline: "EMA cross + time-series momentum filter",
    description:
      "Rides persistent directional regimes. Long when the fast EMA sits above the slow EMA and 90-day momentum is positive; flips short (if enabled) on the mirrored condition. Cuts exposure in chop.",
  },
  mean_reversion: {
    label: "Mean Reversion",
    tagline: "Dip-buying inside the trend gate",
    description:
      "Connors-style pullbacks: buys 2.2σ short-term stretches — but only when price holds above the slow trend gate — and exits on normalisation. Higher turnover, smaller edges, strict regime discipline.",
  },
  breakout: {
    label: "Donchian Breakout",
    tagline: "55-day channel entry / 20-day trailing exit",
    description:
      "Classic turtle-style logic: enter on a 55-day channel break, exit on the opposite 20-day channel. Fewer trades, wider profit tails.",
  },
  ensemble: {
    label: "Ensemble Alpha",
    tagline: "Weighted vote of all three models",
    description:
      "Blends trend (50%), mean reversion (25%) and breakout (25%) into a conviction score. Acts only when the models broadly agree — the consistency engine.",
  },
};

interface Series {
  close: number[];
  high: number[];
  low: number[];
}

function toSeries(candles: Candle[]): Series {
  return {
    close: candles.map((c) => c.c),
    high: candles.map((c) => c.h),
    low: candles.map((c) => c.l),
  };
}

export interface AssetIndicators {
  atr14: number[];
  vol20: number[];
}

/** sig[t] = target exposure chosen with information through close of day t. Exec at t+1 open. */
export function generateSignals(
  strategy: StrategyId,
  candles: Candle[],
  opts: { fast: number; slow: number; allowShort: boolean },
): { sig: Int8Array; atr14: number[] } {
  const s = toSeries(candles);
  const n = s.close.length;
  const sig = new Int8Array(n);
  const atr14 = atr(s.high, s.low, s.close, 14);
  const shortLeg: 0 | -1 = opts.allowShort ? -1 : 0;

  if (strategy === "trend") {
    const fastE = ema(s.close, Math.max(2, opts.fast));
    const slowE = ema(s.close, Math.max(3, opts.slow));
    const mom = momentum(s.close, Math.min(126, Math.max(42, opts.slow)));
    let cur: number = 0;
    for (let t = 0; t < n; t++) {
      const f = fastE[t];
      const sl = slowE[t];
      const m = mom[t];
      if (f === undefined || sl === undefined || m === undefined || Number.isNaN(f) || Number.isNaN(sl) || Number.isNaN(m)) {
        sig[t] = 0 as never;
        continue;
      }
      if (f > sl && m > 0) cur = 1;
      else if (f < sl && m < 0) cur = shortLeg;
      // hysteresis: between conditions, hold current stance only if trend filter agrees with sign
      else if (cur === 1 && m < -0.02) cur = 0;
      else if (cur === -1 && m > 0.02) cur = 0;
      sig[t] = cur as never;
    }
    return { sig, atr14 };
  }

  if (strategy === "mean_reversion") {
    // Connors-style dip-buying: only fade *short-term* stretches and only in
    // the direction of the slow trend gate. Never fight the regime.
    const fastEma = ema(s.close, Math.max(5, opts.fast));
    const gate = ema(s.close, Math.max(20, opts.slow));
    const resid = s.close.map((c, i) => {
      const e = fastEma[i];
      return e === undefined || Number.isNaN(e) ? NaN : c - e;
    });
    const win = Math.max(15, opts.fast * 3);
    const residSd = rollingStdevNaN(resid, win);
    let cur = 0;
    let cooldown = 0;
    const entryZ = 1.6;
    const exitZ = 0.35;
    const hardStopZ = 3.5;
    for (let t = 0; t < n; t++) {
      const r = resid[t];
      const sd = residSd[t];
      const c = s.close[t] ?? 0;
      const g = gate[t];
      const zt = r !== undefined && sd !== undefined && !Number.isNaN(r) && !Number.isNaN(sd) && sd > 0 ? r / sd : NaN;
      const gOk = g !== undefined && !Number.isNaN(g);
      if (Number.isNaN(zt) || !gOk) {
        sig[t] = 0 as never;
        continue;
      }
      if (cooldown > 0) cooldown--;
      if (cur === 0) {
        if (cooldown === 0) {
          if (c > g && zt <= -entryZ) cur = 1; // oversold inside an uptrend
          else if (c < g && zt >= entryZ && opts.allowShort) cur = -1; // overbought inside a downtrend
        }
      } else if (cur === 1) {
        if (zt >= exitZ || c < g * 0.996) cur = 0;
        else if (zt <= -hardStopZ) {
          cur = 0;
          cooldown = 5;
        }
      } else {
        if (zt <= -exitZ || c > g * 1.004) cur = 0;
        else if (zt >= hardStopZ) {
          cur = 0;
          cooldown = 5;
        }
      }
      sig[t] = cur as never;
    }
    return { sig, atr14 };
  }

  if (strategy === "breakout") {
    const entry = Math.max(10, opts.slow);
    const exit = Math.max(5, Math.round(opts.fast));
    const dcHi = rollingMaxShift(s.high, entry);
    const dcLoE = rollingMinShift(s.low, exit);
    const dcLo = rollingMinShift(s.low, entry);
    const dcHiE = rollingMaxShift(s.high, exit);
    let cur = 0;
    for (let t = 0; t < n; t++) {
      const c = s.close[t] ?? 0;
      const hi = dcHi[t];
      const lo = dcLo[t];
      const loE = dcLoE[t];
      const hiE = dcHiE[t];
      if (hi === undefined || lo === undefined || loE === undefined || hiE === undefined ||
          Number.isNaN(hi) || Number.isNaN(lo) || Number.isNaN(loE) || Number.isNaN(hiE)) {
        sig[t] = 0 as never;
        continue;
      }
      if (cur === 0) {
        if (c > hi) cur = 1;
        else if (c < lo && opts.allowShort) cur = -1;
      } else if (cur === 1) {
        if (c < loE) cur = 0;
      } else {
        if (c > hiE) cur = 0;
      }
      sig[t] = cur as never;
    }
    return { sig, atr14 };
  }

  // Ensemble: weighted conviction of the three models.
  const a = generateSignals("trend", candles, opts).sig;
  const b = generateSignals("mean_reversion", candles, opts).sig;
  const c = generateSignals("breakout", candles, opts).sig;
  let cur = 0;
  for (let t = 0; t < n; t++) {
    const score = 0.5 * (a[t] ?? 0) + 0.25 * (b[t] ?? 0) + 0.25 * (c[t] ?? 0);
    if (score >= 0.3) cur = 1;
    else if (score <= -0.3) cur = shortLeg;
    else if (cur !== 0 && Math.abs(score) < 0.05) cur = 0;
    sig[t] = cur as never;
  }
  return { sig, atr14 };
}

export const strategyIds: StrategyId[] = ["trend", "mean_reversion", "breakout", "ensemble"];
