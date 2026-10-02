export type StrategyId = "trend" | "mean_reversion" | "breakout" | "ensemble";

export interface BacktestParams {
  name: string;
  seed: number;
  years: number;
  initialCapital: number;
  strategy: StrategyId;
  /** fast lookback (trend) / zscore window (mr) — interpreted per strategy */
  fast: number;
  slow: number;
  /** annualised volatility target per unit of risk budget, e.g. 0.12 = 12% */
  targetVol: number;
  /** gross exposure cap, 1.0 = no leverage */
  maxGross: number;
  feeBps: number;
  slippageBps: number;
  /** trailing stop distance in ATR multiples, 0 = disabled */
  stopAtr: number;
  allowShort: boolean;
  /** kill-switch: flatten portfolio when drawdown exceeds this fraction */
  killSwitchDD: number;
  /** weekly consistency target, e.g. 0.015 = +1.5% / week */
  weeklyTarget: number;
  /** symbols of the synthetic universe to trade */
  universe: string[];
}

export interface Candle {
  t: string; // ISO date yyyy-mm-dd
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface AssetDef {
  symbol: string;
  name: string;
  assetClass: string;
  /** annualised base drift */
  drift: number;
  /** annualised base volatility */
  vol: number;
  /** sensitivity to the shared market factor */
  beta: number;
  startPrice: number;
  baseVolume: number;
}

export interface TradeRec {
  id: number;
  symbol: string;
  side: 1 | -1;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  qty: number;
  notional: number;
  pnl: number;
  costs: number;
  ret: number;
  holdingDays: number;
  exitReason: "SIGNAL" | "TRAILING_STOP" | "KILL_SWITCH" | "END_OF_DATA";
}

export interface Metrics {
  totalReturn: number;
  cagr: number;
  annVol: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  maxDDPeakDate: string;
  maxDDTroughDate: string;
  calmar: number;
  trades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  exposure: number;
  tradesPerMonth: number;
  weeksTotal: number;
  weeksWinPct: number;
  weeksAboveTargetPct: number;
  bestWeek: number;
  worstWeek: number;
  weeklySharpe: number;
}

export interface WeeklyPoint {
  label: string;
  start: string;
  end: string;
  ret: number;
  aboveTarget: boolean;
}

export interface CurvePoint {
  t: string;
  v: number;
}

export interface MonteCarloResult {
  targetWeekly: number;
  sims: number;
  probAboveTarget: number;
  probPositive: number;
  week: { p5: number; p25: number; p50: number; p75: number; p95: number; mean: number };
  fan: { week: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
  requiredCagr: number;
  engineCagr: number;
  /** probability the full year's compounded return is positive */
  probYearPositive: number;
}

export interface BacktestResult {
  params: BacktestParams;
  candles: Record<string, Candle[]>;
  equity: CurvePoint[];
  benchmark: CurvePoint[];
  drawdown: CurvePoint[];
  weekly: WeeklyPoint[];
  returns: number[];
  metrics: Metrics;
  trades: TradeRec[];
  monteCarlo: MonteCarloResult;
}
