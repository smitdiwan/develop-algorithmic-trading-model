import type { CurvePoint, Metrics, TradeRec, WeeklyPoint } from "./types";

function mean(a: number[]): number {
  if (a.length === 0) return 0;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

function stdev(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  let s = 0;
  for (const v of a) s += (v - m) * (v - m);
  return Math.sqrt(s / (a.length - 1));
}

export function computeDrawdown(equity: CurvePoint[]): CurvePoint[] {
  let peak = -Infinity;
  return equity.map((p) => {
    peak = Math.max(peak, p.v);
    return { t: p.t, v: peak > 0 ? p.v / peak - 1 : 0 };
  });
}

export function computeWeekly(
  equity: CurvePoint[],
  weeklyTarget: number,
): WeeklyPoint[] {
  const out: WeeklyPoint[] = [];
  for (let i = 0; i + 5 < equity.length; i += 5) {
    const start = equity[i];
    const end = equity[i + 5];
    if (!start || !end) continue;
    const ret = start.v !== 0 ? end.v / start.v - 1 : 0;
    out.push({
      label: `W${out.length + 1}`,
      start: start.t,
      end: end.t,
      ret,
      aboveTarget: ret >= weeklyTarget,
    });
  }
  return out;
}

export function computeMetrics(params: {
  equity: CurvePoint[];
  initialCapital: number;
  returns: number[];
  trades: TradeRec[];
  weekly: WeeklyPoint[];
  exposure: number;
}): Metrics {
  const { equity, initialCapital, returns, trades, weekly, exposure } = params;

  const first = equity[0];
  const last = equity[equity.length - 1];
  const finalV = last?.v ?? initialCapital;
  const days = Math.max(1, equity.length - 1);
  const totalReturn = initialCapital > 0 ? finalV / initialCapital - 1 : 0;
  const cagr = Math.pow(Math.max(1e-9, finalV / Math.max(1e-9, initialCapital)), 252 / days) - 1;

  const annVol = stdev(returns) * Math.sqrt(252);
  const meanAnn = mean(returns) * 252;
  const sharpe = annVol > 0 ? meanAnn / annVol : 0;
  const downside = returns.filter((r) => r < 0);
  const sortino = stdev(downside) > 0 ? meanAnn / (stdev(downside) * Math.sqrt(252)) : 0;

  // Max drawdown with dates
  let peak = -Infinity;
  let peakDate = first?.t ?? "";
  let maxDD = 0;
  let ddPeakDate = peakDate;
  let ddTroughDate = peakDate;
  for (const p of equity) {
    if (p.v > peak) {
      peak = p.v;
      peakDate = p.t;
    }
    const dd = peak > 0 ? p.v / peak - 1 : 0;
    if (dd < maxDD) {
      maxDD = dd;
      ddPeakDate = peakDate;
      ddTroughDate = p.t;
    }
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const weekRets = weekly.map((w) => w.ret);
  const wMean = mean(weekRets);
  const wSd = stdev(weekRets);

  return {
    totalReturn,
    cagr,
    annVol,
    sharpe,
    sortino,
    maxDrawdown: maxDD,
    maxDDPeakDate: ddPeakDate,
    maxDDTroughDate: ddTroughDate,
    calmar: maxDD < 0 ? cagr / Math.abs(maxDD) : 0,
    trades: trades.length,
    winRate: trades.length > 0 ? wins.length / trades.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    expectancy: trades.length > 0 ? trades.reduce((s, t) => s + t.ret, 0) / trades.length : 0,
    avgWin: wins.length > 0 ? wins.reduce((s, t) => s + t.ret, 0) / wins.length : 0,
    avgLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.ret, 0) / losses.length : 0,
    exposure,
    tradesPerMonth: trades.length / Math.max(1, days / 21),
    weeksTotal: weekly.length,
    weeksWinPct: weekly.length > 0 ? weekly.filter((w) => w.ret > 0).length / weekly.length : 0,
    weeksAboveTargetPct:
      weekly.length > 0 ? weekly.filter((w) => w.aboveTarget).length / weekly.length : 0,
    bestWeek: weekRets.length > 0 ? Math.max(...weekRets) : 0,
    worstWeek: weekRets.length > 0 ? Math.min(...weekRets) : 0,
    weeklySharpe: wSd > 0 ? (wMean / wSd) * Math.sqrt(52) : 0,
  };
}
