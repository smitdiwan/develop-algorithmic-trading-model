import { makeRng } from "./prng";
import type { MonteCarloResult } from "./types";

/**
 * Block-bootstrap Monte Carlo.
 *
 * Resampling 5-day contiguous blocks of realised daily returns preserves
 * short-horizon autocorrelation and vol clustering, giving an honest
 * distribution of what "next week" — and the next 52 weeks — can look like.
 */
export function runMonteCarlo(params: {
  dailyReturns: number[];
  weeklyTarget: number;
  seed: number;
  engineCagr: number;
}): MonteCarloResult {
  const { dailyReturns, weeklyTarget, seed, engineCagr } = params;
  const { rand } = makeRng((seed ^ 0x9e3779b9) >>> 0, "monte-carlo");
  const rets = dailyReturns.length > 10 ? dailyReturns : [0];

  const drawWeek = (): number => {
    const start = Math.floor(rand() * Math.max(1, rets.length - 5));
    let acc = 1;
    for (let i = 0; i < 5; i++) acc *= 1 + (rets[start + i] ?? 0);
    return acc - 1;
  };

  // ---- Weekly distribution ----
  const WEEK_SIMS = 20000;
  const weeks = new Float64Array(WEEK_SIMS);
  let above = 0;
  let positive = 0;
  for (let i = 0; i < WEEK_SIMS; i++) {
    const w = drawWeek();
    weeks[i] = w;
    if (w >= weeklyTarget) above++;
    if (w > 0) positive++;
  }
  const sorted = Array.from(weeks).sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;

  // ---- 52-week equity fan ----
  const PATHS = 1500;
  const WEEKS = 52;
  const fanGrid: number[][] = Array.from({ length: WEEKS }, () => []);
  let yearPositive = 0;
  for (let p = 0; p < PATHS; p++) {
    let eq = 1;
    for (let w = 0; w < WEEKS; w++) {
      eq *= 1 + drawWeek();
      fanGrid[w]?.push(eq);
    }
    if (eq > 1) yearPositive++;
  }
  const fan = fanGrid.map((vals, i) => {
    const s = vals.sort((a, b) => a - b);
    const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 1;
    return { week: i + 1, p5: q(0.05) - 1, p25: q(0.25) - 1, p50: q(0.5) - 1, p75: q(0.75) - 1, p95: q(0.95) - 1 };
  });

  let wSum = 0;
  for (const v of weeks) wSum += v;

  return {
    targetWeekly: weeklyTarget,
    sims: WEEK_SIMS,
    probAboveTarget: above / WEEK_SIMS,
    probPositive: positive / WEEK_SIMS,
    week: {
      p5: pct(0.05),
      p25: pct(0.25),
      p50: pct(0.5),
      p75: pct(0.75),
      p95: pct(0.95),
      mean: wSum / WEEK_SIMS,
    },
    fan,
    requiredCagr: Math.pow(1 + weeklyTarget, 52) - 1,
    engineCagr,
    probYearPositive: yearPositive / PATHS,
  };
}
