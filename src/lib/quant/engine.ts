import { generateUniverse } from "./data";
import { rollingVol } from "./indicators";
import { computeDrawdown, computeMetrics, computeWeekly } from "./metrics";
import { runMonteCarlo } from "./montecarlo";
import { generateSignals } from "./strategies";
import type { BacktestParams, BacktestResult, Candle, CurvePoint, TradeRec } from "./types";

interface Position {
  symbol: string;
  side: 1 | -1;
  qty: number; // signed
  entryPrice: number;
  entryDate: string;
  entryCost: number;
  entryIdx: number;
  atrAtEntry: number;
  stop: number;
}

const FIN_RATE = 0.045; // annual financing on borrowed notional
/** Gross scaler divides the vol target across active signals; the multiplier
 *  compensates for signals rarely being active at 100% duty cycle. */
const UTILIZATION = 1.5;
/** Max concurrent positions — concentrates risk budget instead of diluting it. */
const POSITION_CAP = 3;
const MAX_ASSET_WEIGHT = 0.95;

/**
 * Event-driven daily backtest.
 *
 * Signals are computed on close[t-1] and executed at open[t] — strictly no
 * lookahead. Positions are sized at entry to a volatility target, charged
 * fees + slippage, protected by ATR trailing stops, and the whole book is
 * flattened by a circuit breaker when the drawdown kill-switch triggers.
 */
export function runBacktest(params: BacktestParams): BacktestResult {
  const symbols = params.universe.length > 0 ? params.universe : ["EQX"];
  const { dates, candles } = generateUniverse(params.seed, params.years, symbols);
  const n = dates.length;

  // ---- per-asset signal + indicator prep ----
  const sigs: Record<string, Int8Array> = {};
  const atrs: Record<string, number[]> = {};
  const vols: Record<string, number[]> = {};
  let warmup = 40;
  for (const sym of symbols) {
    const c = candles[sym];
    if (!c) continue;
    const { sig, atr14 } = generateSignals(params.strategy, c, {
      fast: params.fast,
      slow: params.slow,
      allowShort: params.allowShort,
    });
    sigs[sym] = sig;
    atrs[sym] = atr14;
    const closes = c.map((k) => k.c);
    vols[sym] = rollingVol(closes, 20).map((v) =>
      Number.isNaN(v) ? NaN : Math.min(1.2, Math.max(0.045, v)),
    );
    warmup = Math.max(warmup, params.slow + 8, 66);
  }
  warmup = Math.min(warmup, n - 120);

  const feeRate = (params.feeBps + 0) / 10_000;
  const slipRate = params.slippageBps / 10_000;

  // ---- portfolio state ----
  let cash = params.initialCapital;
  const positions = new Map<string, Position>();
  /** stop-out grace period: dir blocked until bar index */
  const stoppedUntil = new Map<string, { dir: number; until: number }>();
  let cooldown = 0;
  let pendingKill = false;
  let peakEquity = params.initialCapital;
  let equity = params.initialCapital;

  const equityCurve: CurvePoint[] = [{ t: dates[warmup] ?? "", v: params.initialCapital }];
  const dailyReturns: number[] = [];
  const trades: TradeRec[] = [];
  let exposureSum = 0;
  let tradeId = 0;

  const closePosition = (
    sym: string,
    pos: Position,
    exitPriceRaw: number,
    date: string,
    idx: number,
    reason: TradeRec["exitReason"],
  ) => {
    const isLong = pos.side === 1;
    const exitPrice = isLong ? exitPriceRaw * (1 - slipRate) : exitPriceRaw * (1 + slipRate);
    const notionalExit = Math.abs(pos.qty) * exitPrice;
    const exitCost = notionalExit * feeRate;
    cash += pos.qty * exitPrice - exitCost; // qty signed: buy-back for shorts reduces cash via qty<0
    const pnl = pos.qty * (exitPrice - pos.entryPrice) - (pos.entryCost + exitCost);
    const notionalEntry = Math.abs(pos.qty) * pos.entryPrice;
    trades.push({
      id: ++tradeId,
      symbol: sym,
      side: pos.side,
      entryDate: pos.entryDate,
      entryPrice: round4(pos.entryPrice),
      exitDate: date,
      exitPrice: round4(exitPrice),
      qty: Math.abs(pos.qty),
      notional: notionalEntry,
      pnl: round2(pnl),
      costs: round2(pos.entryCost + exitCost),
      ret: notionalEntry > 0 ? pnl / notionalEntry : 0,
      holdingDays: idx - pos.entryIdx,
      exitReason: reason,
    });
    positions.delete(sym);
  };

  for (let t = warmup + 1; t < n; t++) {
    const date = dates[t] ?? "";
    const desired: Record<string, number> = {};
    for (const sym of symbols) {
      let d = sigs[sym]?.[t - 1] ?? 0;
      if (cooldown > 0 || pendingKill) d = 0;
      desired[sym] = d;
      if (d === 0) stoppedUntil.delete(sym); // signal reset → stop-block expires
    }
    if (cooldown > 0) cooldown--;

    // ---- 1. exits at the open (signal change / kill-switch) ----
    for (const [sym, pos] of [...positions.entries()]) {
      const target = desired[sym] ?? 0;
      const dayC = candles[sym]?.[t];
      if (!dayC) continue;
      if (target === 0 || target !== pos.side) {
        closePosition(sym, pos, dayC.o, date, t, pendingKill ? "KILL_SWITCH" : "SIGNAL");
      }
    }
    if (pendingKill) {
      pendingKill = false;
      cooldown = 10;
    }

    // ---- 2. entries at the open ----
    // Equal-risk budgeting: split the vol target across the active signals.
    let nActive = 0;
    for (const sym of symbols) {
      if ((desired[sym] ?? 0) !== 0) nActive++;
    }
    nActive = Math.max(1, Math.min(POSITION_CAP, nActive));

    // Gross scaler: size new entries as if all slots were filled, so the book
    // respects the leverage cap without ordering bias.
    let rawSum = 0;
    for (const sym of symbols) {
      if ((desired[sym] ?? 0) !== 0) {
        const ve = vols[sym]?.[t - 1];
        if (ve !== undefined && !Number.isNaN(ve) && ve > 0) {
          rawSum += (params.targetVol * UTILIZATION) / (ve * Math.sqrt(nActive));
        }
      }
    }
    const grossScale = rawSum > params.maxGross ? params.maxGross / rawSum : 1;

    let slots = Math.max(0, POSITION_CAP - positions.size);
    let grossNow = currentGross(positions, candles, t);
    for (const sym of symbols) {
      if (slots <= 0) break;
      const target = desired[sym] ?? 0;
      if (target === 0 || positions.has(sym)) continue;
      const block = stoppedUntil.get(sym);
      if (block && block.dir === target && t < block.until) continue; // stop-out grace period

      const dayC = candles[sym]?.[t];
      const volEst = vols[sym]?.[t - 1];
      const atrv = atrs[sym]?.[t - 1];
      if (!dayC || volEst === undefined || Number.isNaN(volEst) || atrv === undefined || Number.isNaN(atrv)) continue;

      let weight = (params.targetVol * UTILIZATION) / (volEst * Math.sqrt(nActive));
      weight *= grossScale;
      const room = Math.max(0, params.maxGross - grossNow);
      weight = Math.min(weight, room, MAX_ASSET_WEIGHT);
      if (weight < 0.015) continue;

      const side: 1 | -1 = target > 0 ? 1 : -1;
      const exec = side === 1 ? dayC.o * (1 + slipRate) : dayC.o * (1 - slipRate);
      const notional = weight * equity;
      const qty = (side * notional) / exec;
      if (Math.abs(qty) * exec < equity * 0.005) continue;

      const cost = Math.abs(qty) * exec * feeRate;
      cash -= qty * exec + cost;
      grossNow += Math.abs(qty) * exec;

      const stopDist = params.stopAtr * atrv;
      const stop =
        params.stopAtr > 0
          ? side === 1
            ? exec - stopDist
            : exec + stopDist
          : side === 1
            ? -Infinity
            : Infinity;

      positions.set(sym, {
        symbol: sym,
        side,
        qty,
        entryPrice: exec,
        entryDate: date,
        entryCost: cost,
        entryIdx: t,
        atrAtEntry: atrv,
        stop,
      });
      stoppedUntil.delete(sym);
      slots--;
    }

    // ---- 3. intraday trailing stops ----
    for (const [sym, pos] of [...positions.entries()]) {
      const dayC = candles[sym]?.[t];
      if (!dayC) continue;
      const atrv = atrs[sym]?.[t] ?? pos.atrAtEntry;
      if (pos.side === 1) {
        if (params.stopAtr > 0) {
          pos.stop = Math.max(pos.stop, dayC.h - params.stopAtr * atrv);
          if (dayC.l <= pos.stop) {
            closePosition(sym, pos, Math.min(dayC.o, pos.stop), date, t, "TRAILING_STOP");
            stoppedUntil.set(sym, { dir: 1, until: t + 8 });
            continue;
          }
        }
      } else {
        if (params.stopAtr > 0) {
          pos.stop = Math.min(pos.stop, dayC.l + params.stopAtr * atrv);
          if (dayC.h >= pos.stop) {
            closePosition(sym, pos, Math.max(dayC.o, pos.stop), date, t, "TRAILING_STOP");
            stoppedUntil.set(sym, { dir: -1, until: t + 8 });
            continue;
          }
        }
      }
    }

    // ---- 4. financing on borrowed notional ----
    const grossClose = currentGross(positions, candles, t);
    const borrowed = Math.max(0, grossClose - equity);
    if (borrowed > 0 && params.maxGross > 1) {
      cash -= (borrowed * FIN_RATE) / 252;
    }

    // ---- 5. mark to market ----
    let mtm = cash;
    for (const [sym, pos] of positions) {
      const c = candles[sym]?.[t]?.c;
      if (c !== undefined) mtm += pos.qty * c;
    }
    const prevEquity = equity;
    equity = mtm;
    dailyReturns.push(prevEquity !== 0 ? equity / prevEquity - 1 : 0);
    exposureSum += equity !== 0 ? grossClose / equity : 0;
    equityCurve.push({ t: date, v: round2(equity) });

    // ---- 6. kill switch ----
    peakEquity = Math.max(peakEquity, equity);
    if (
      params.killSwitchDD > 0 &&
      equity < peakEquity * (1 - params.killSwitchDD) &&
      positions.size > 0
    ) {
      pendingKill = true;
    }
  }

  // ---- liquidate at final close for clean terminal accounting ----
  const lastDate = dates[n - 1] ?? "";
  for (const [sym, pos] of [...positions.entries()]) {
    const c = candles[sym]?.[n - 1]?.c;
    if (c !== undefined) closePosition(sym, pos, c, lastDate, n - 1, "END_OF_DATA");
  }
  if (equityCurve.length > 0) {
    const last = equityCurve[equityCurve.length - 1];
    if (last) last.v = round2(cash);
    equity = cash;
  }

  const daysRecorded = Math.max(1, equityCurve.length - 1);
  const exposure = exposureSum / daysRecorded;

  const benchmark: CurvePoint[] = [];
  const benchSym = candles["EQX"] ? "EQX" : symbols[0] ?? "EQX";
  const benchCandles = candles[benchSym];
  if (benchCandles) {
    const base = benchCandles[warmup]?.c ?? 1;
    for (let t = warmup; t < n; t++) {
      const c = benchCandles[t];
      if (!c) continue;
      benchmark.push({ t: dates[t] ?? "", v: round2((params.initialCapital * c.c) / base) });
    }
  }

  const drawdown = computeDrawdown(equityCurve);
  const weekly = computeWeekly(equityCurve, params.weeklyTarget);
  const metrics = computeMetrics({
    equity: equityCurve,
    initialCapital: params.initialCapital,
    returns: dailyReturns,
    trades,
    weekly,
    exposure,
  });
  const monteCarlo = runMonteCarlo({
    dailyReturns,
    weeklyTarget: params.weeklyTarget,
    seed: params.seed,
    engineCagr: metrics.cagr,
  });

  return {
    params,
    candles,
    equity: equityCurve,
    benchmark,
    drawdown,
    weekly,
    returns: dailyReturns,
    metrics,
    trades,
    monteCarlo,
  };
}

function currentGross(
  positions: Map<string, Position>,
  candles: Record<string, Candle[]>,
  t: number,
): number {
  let g = 0;
  for (const [sym, pos] of positions) {
    const c = candles[sym]?.[t]?.c ?? pos.entryPrice;
    g += Math.abs(pos.qty) * c;
  }
  return g;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10_000) / 10_000;
}
