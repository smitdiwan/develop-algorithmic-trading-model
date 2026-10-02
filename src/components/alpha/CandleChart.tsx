"use client";

import { useEffect, useRef } from "react";
import { createChart, type SeriesMarker, type UTCTimestamp } from "lightweight-charts";
import type { Candle, TradeRec } from "@/lib/quant/types";

export function CandleChart({
  candles,
  trades,
  symbol,
}: {
  candles: Candle[];
  trades: TradeRec[];
  symbol: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor: "#79715F",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(96,84,62,0.22)" },
        horzLines: { color: "rgba(96,84,62,0.22)" },
      },
      crosshair: {
        vertLine: { color: "rgba(14,124,134,0.4)", labelBackgroundColor: "#D9D1C0" },
        horzLine: { color: "rgba(14,124,134,0.4)", labelBackgroundColor: "#D9D1C0" },
      },
      rightPriceScale: { borderColor: "#D9D1C0" },
      timeScale: { borderColor: "#D9D1C0" },
      width: el.clientWidth,
      height: el.clientHeight,
    });

    const cs = chart.addCandlestickSeries({
      upColor: "#1C6B4A",
      downColor: "#C2413B",
      wickUpColor: "rgba(28,107,73,0.65)",
      wickDownColor: "rgba(194,65,59,0.65)",
      borderVisible: false,
    });
    cs.setData(
      candles.map((c) => ({
        time: c.t as UTCTimestamp & string,
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      })),
    );

    const vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(
      candles.map((c) => ({
        time: c.t as UTCTimestamp & string,
        value: c.v,
        color: c.c >= c.o ? "rgba(28,107,73,0.14)" : "rgba(194,65,59,0.14)",
      })),
    );

    const markers: SeriesMarker<UTCTimestamp>[] = [];
    for (const tr of trades) {
      if (tr.symbol !== symbol) continue;
      const long = tr.side === 1;
      markers.push({
        time: tr.entryDate as UTCTimestamp & string,
        position: long ? "belowBar" : "aboveBar",
        color: long ? "#1C6B4A" : "#0E7C86",
        shape: long ? "arrowUp" : "arrowDown",
        text: long ? "B" : "S",
        size: 1,
      });
      markers.push({
        time: tr.exitDate as UTCTimestamp & string,
        position: long ? "aboveBar" : "belowBar",
        color: tr.pnl >= 0 ? "#1C6B4A" : "#C2413B",
        shape: "circle",
        text: `${tr.pnl >= 0 ? "+" : ""}${(tr.ret * 100).toFixed(1)}%`,
        size: 0.8,
      });
    }
    markers.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    cs.setMarkers(markers);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [candles, trades, symbol]);

  return (
    <div>
      <div className="num mb-2 flex items-center justify-between text-[10px] tracking-[0.2em] text-[#79715F]">
        <span>
          {symbol} · MARKET TAPE <span className="text-[#1C6B4A]">▲ BUY</span>{" "}
          <span className="text-[#0E7C86]">▼ SELL</span> <span className="text-[#5A5344]">● EXIT (P/L)</span>
        </span>
        <span>{trades.filter((t) => t.symbol === symbol).length} EXECUTIONS</span>
      </div>
      <div ref={ref} className="h-[400px] w-full md:h-[460px]" />
    </div>
  );
}
