"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type UTCTimestamp,
} from "lightweight-charts";
import type { CurvePoint } from "@/lib/quant/types";

const baseLayout = {
  background: { color: "transparent" },
  textColor: "#79715F",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
};

const gridOpts = {
  vertLines: { color: "rgba(96,84,62,0.22)" },
  horzLines: { color: "rgba(96,84,62,0.22)" },
};

const crosshairOpts = {
  vertLine: { color: "rgba(28,107,73,0.4)", labelBackgroundColor: "#D9D1C0" },
  horzLine: { color: "rgba(28,107,73,0.4)", labelBackgroundColor: "#D9D1C0" },
};

export function EquityChart({
  equity,
  benchmark,
  drawdown,
}: {
  equity: CurvePoint[];
  benchmark: CurvePoint[];
  drawdown: CurvePoint[];
}) {
  const eqRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eqEl = eqRef.current;
    const ddEl = ddRef.current;
    if (!eqEl || !ddEl) return;

    const charts: IChartApi[] = [];

    const eqChart = createChart(eqEl, {
      layout: baseLayout,
      grid: gridOpts,
      crosshair: crosshairOpts,
      rightPriceScale: { borderColor: "#D9D1C0" },
      timeScale: { borderColor: "#D9D1C0", timeVisible: false },
      width: eqEl.clientWidth,
      height: eqEl.clientHeight,
    });
    charts.push(eqChart);

    const eqSeries = eqChart.addAreaSeries({
      lineColor: "#1C6B4A",
      lineWidth: 2,
      topColor: "rgba(28,107,73,0.16)",
      bottomColor: "rgba(28,107,73,0.0)",
      priceLineVisible: false,
      crosshairMarkerRadius: 3,
    });
    eqSeries.setData(equity.map((p) => ({ time: p.t as UTCTimestamp & string, value: p.v })));

    if (benchmark.length > 2) {
      const bmSeries = eqChart.addLineSeries({
        color: "#8A8272",
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      bmSeries.setData(benchmark.map((p) => ({ time: p.t as UTCTimestamp & string, value: p.v })));
    }

    const ddChart = createChart(ddEl, {
      layout: baseLayout,
      grid: gridOpts,
      crosshair: crosshairOpts,
      rightPriceScale: { borderColor: "#D9D1C0" },
      timeScale: { borderColor: "#D9D1C0" },
      width: ddEl.clientWidth,
      height: ddEl.clientHeight,
    });
    charts.push(ddChart);

    const ddSeries = ddChart.addAreaSeries({
      lineColor: "#C2413B",
      lineWidth: 1,
      topColor: "rgba(194,65,59,0.0)",
      bottomColor: "rgba(194,65,59,0.2)",
      priceLineVisible: false,
      priceFormat: { type: "percent" },
      crosshairMarkerRadius: 3,
    });
    ddSeries.setData(drawdown.map((p) => ({ time: p.t as UTCTimestamp & string, value: p.v })));

    eqChart.timeScale().fitContent();
    ddChart.timeScale().fitContent();

    let syncing = false;
    const sync = (src: IChartApi, dst: IChartApi) => {
      src.timeScale().subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
        if (syncing || !range) return;
        syncing = true;
        dst.timeScale().setVisibleLogicalRange(range);
        syncing = false;
      });
    };
    sync(eqChart, ddChart);
    sync(ddChart, eqChart);

    const ro = new ResizeObserver(() => {
      eqChart.applyOptions({ width: eqEl.clientWidth, height: eqEl.clientHeight });
      ddChart.applyOptions({ width: ddEl.clientWidth, height: ddEl.clientHeight });
    });
    ro.observe(eqEl);
    ro.observe(ddEl);

    return () => {
      ro.disconnect();
      charts.forEach((c) => c.remove());
    };
  }, [equity, benchmark, drawdown]);

  return (
    <div>
      <div className="num mb-2 flex items-center justify-between text-[10px] tracking-[0.2em] text-[#79715F]">
        <span>
          EQUITY CURVE <span className="text-[#1C6B4A]">— STRATEGY</span>
          <span className="text-[#8A8272]"> ··· BENCHMARK (EQX)</span>
        </span>
        <span>{equity.length} SESSIONS</span>
      </div>
      <div ref={eqRef} className="h-[300px] w-full md:h-[360px]" />
      <div className="num mt-4 mb-2 flex items-center justify-between text-[10px] tracking-[0.2em] text-[#79715F]">
        <span className="text-[#C2413B]">DRAWDOWN</span>
        <span>UNDERWATER PROFILE</span>
      </div>
      <div ref={ddRef} className="h-[110px] w-full" />
    </div>
  );
}
