/** Vectorised technical indicators. Warmup cells are NaN. */

export function ema(src: number[], period: number): number[] {
  const out = new Array<number>(src.length).fill(NaN);
  if (src.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += src[i] ?? 0;
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < src.length; i++) {
    prev = (src[i] ?? prev) * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function sma(src: number[], period: number): number[] {
  const out = new Array<number>(src.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i] ?? 0;
    if (i >= period) sum -= src[i - period] ?? 0;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function rollingStdev(src: number[], period: number): number[] {
  const out = new Array<number>(src.length).fill(NaN);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i] ?? 0;
    sum += v;
    sumSq += v * v;
    if (i >= period) {
      const v0 = src[i - period] ?? 0;
      sum -= v0;
      sumSq -= v0 * v0;
    }
    if (i >= period - 1) {
      const mean = sum / period;
      const varr = Math.max(0, sumSq / period - mean * mean);
      out[i] = Math.sqrt(varr);
    }
  }
  return out;
}

/** NaN-safe rolling stdev: NaN cells are skipped (used for residual series). */
export function rollingStdevNaN(src: number[], period: number): number[] {
  const n = src.length;
  const out = new Array<number>(n).fill(NaN);
  const win: number[] = [];
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = src[i] ?? NaN;
    win.push(v);
    if (!Number.isNaN(v)) {
      sum += v;
      sumSq += v * v;
    }
    if (win.length > period) {
      const old = win.shift() ?? NaN;
      if (!Number.isNaN(old)) {
        sum -= old;
        sumSq -= old * old;
      }
    }
    if (win.length === period) {
      const cnt = win.filter((x) => !Number.isNaN(x)).length;
      if (cnt >= Math.max(4, Math.floor(period * 0.6))) {
        const mean = sum / cnt;
        const varr = Math.max(0, sumSq / cnt - mean * mean);
        out[i] = Math.sqrt(varr);
      }
    }
  }
  return out;
}

/** Daily log/simple returns of a close series (index 0 = 0). */
export function returns(close: number[]): number[] {
  const out = new Array<number>(close.length).fill(0);
  for (let i = 1; i < close.length; i++) {
    const c0 = close[i - 1] ?? 1;
    out[i] = c0 !== 0 ? (close[i] ?? c0) / c0 - 1 : 0;
  }
  return out;
}

/** Annualised rolling volatility from daily returns. */
export function rollingVol(close: number[], period: number): number[] {
  const rets = returns(close);
  const sd = rollingStdev(rets, period);
  return sd.map((v) => (Number.isNaN(v) ? NaN : v * Math.sqrt(252)));
}

/** Wilder ATR. */
export function atr(high: number[], low: number[], close: number[], period: number): number[] {
  const n = close.length;
  const out = new Array<number>(n).fill(NaN);
  if (n <= period) return out;
  const tr = new Array<number>(n).fill(NaN);
  for (let i = 1; i < n; i++) {
    const h = high[i] ?? 0;
    const l = low[i] ?? 0;
    const pc = close[i - 1] ?? 0;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i] ?? 0;
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + (tr[i] ?? 0)) / period;
    out[i] = prev;
  }
  return out;
}

/** Wilder RSI. */
export function rsi(close: number[], period: number): number[] {
  const n = close.length;
  const out = new Array<number>(n).fill(NaN);
  if (n <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = (close[i] ?? 0) - (close[i - 1] ?? 0);
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < n; i++) {
    const d = (close[i] ?? 0) - (close[i - 1] ?? 0);
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** Rolling max of `src` over the `period` bars *ending the day before* i (no lookahead). */
export function rollingMaxShift(src: number[], period: number): number[] {
  const n = src.length;
  const out = new Array<number>(n).fill(NaN);
  for (let i = period; i < n; i++) {
    let m = -Infinity;
    for (let j = i - period; j < i; j++) m = Math.max(m, src[j] ?? m);
    out[i] = m;
  }
  return out;
}

export function rollingMinShift(src: number[], period: number): number[] {
  const n = src.length;
  const out = new Array<number>(n).fill(NaN);
  for (let i = period; i < n; i++) {
    let m = Infinity;
    for (let j = i - period; j < i; j++) m = Math.min(m, src[j] ?? m);
    out[i] = m;
  }
  return out;
}

/** Price momentum over `period` bars: close[i]/close[i-period] - 1. */
export function momentum(close: number[], period: number): number[] {
  const n = close.length;
  const out = new Array<number>(n).fill(NaN);
  for (let i = period; i < n; i++) {
    const a = close[i - period] ?? NaN;
    const b = close[i] ?? NaN;
    out[i] = a > 0 ? b / a - 1 : NaN;
  }
  return out;
}

/** Z-score vs rolling mean/sd. */
export function zscore(close: number[], period: number): number[] {
  const mean = sma(close, period);
  const sd = rollingStdev(close, period);
  const out = new Array<number>(close.length).fill(NaN);
  for (let i = 0; i < close.length; i++) {
    const m = mean[i];
    const s = sd[i];
    const c = close[i];
    if (m !== undefined && s !== undefined && c !== undefined && !Number.isNaN(m) && !Number.isNaN(s) && s > 0) {
      out[i] = (c - m) / s;
    }
  }
  return out;
}
