"use client";

import { useEffect, useState } from "react";
import { Database, Trash2 } from "lucide-react";
import type { BacktestParams, Metrics } from "@/lib/quant/types";
import { fmtPct, fmtNum } from "@/lib/format";

interface RunRow {
  id: string;
  name: string;
  strategy: string;
  params: BacktestParams;
  metrics: Metrics;
  createdAt: string;
}

export function RunHistory({ onLoad, activeId }: { onLoad: (id: string) => void; activeId: string | null }) {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/runs");
        const json = (await res.json()) as { runs?: RunRow[] };
        if (!cancelled) setRuns(json.runs ?? []);
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const del = async (id: string) => {
    setRuns((r) => r.filter((x) => x.id !== id));
    await fetch(`/api/runs/${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div id="runs" className="mt-20 scroll-mt-6">
      <div className="num mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#79715F]">
          <Database className="h-3.5 w-3.5 text-[#1C6B4A]" />
          PERSISTED RUNS · POSTGRESQL
        </div>
        <span className="text-[10px] tracking-[0.2em] text-[#8A8272]">{runs.length} STORED</span>
      </div>

      {loading ? (
        <div className="num py-8 text-center text-[10px] tracking-[0.25em] text-[#79715F]">READING STORE…</div>
      ) : runs.length === 0 ? (
        <div className="card num flex h-28 items-center justify-center text-[10px] tracking-[0.22em] text-[#79715F]">
          NO PERSISTED RUNS YET — HIT “RUN BACKTEST” TO STORE ONE
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {runs.map((r) => {
            const m = r.metrics;
            const active = r.id === activeId;
            return (
              <div
                key={r.id}
                className={`card card-hover group relative cursor-pointer p-4 ${active ? "border-[#1C6B4A]/60" : ""}`}
                onClick={() => onLoad(r.id)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-bold tracking-wide text-[#1C1A13]">{r.name.toUpperCase()}</div>
                    <div className="num mt-0.5 text-[9px] tracking-[0.18em] text-[#79715F]">
                      {new Date(r.createdAt).toLocaleString()} · SEED {r.params.seed} · {r.params.years}Y
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      del(r.id);
                    }}
                    className="text-[#B4A98E] opacity-0 transition-all hover:text-[#C2413B] group-hover:opacity-100"
                    title="Delete run"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="num grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div>
                    <div className={`text-[13px] font-semibold ${m.cagr >= 0 ? "text-[#1C6B4A]" : "text-[#C2413B]"}`}>{fmtPct(m.cagr, 1)}</div>
                    <div className="mt-0.5 text-[8px] tracking-[0.15em] text-[#79715F]">CAGR</div>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#1C1A13]">{fmtNum(m.sharpe, 2)}</div>
                    <div className="mt-0.5 text-[8px] tracking-[0.15em] text-[#79715F]">SHARPE</div>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#C2413B]">{fmtPct(m.maxDrawdown, 0, false)}</div>
                    <div className="mt-0.5 text-[8px] tracking-[0.15em] text-[#79715F]">MAX DD</div>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#0E7C86]">{fmtPct(m.weeksAboveTargetPct, 0, false)}</div>
                    <div className="mt-0.5 text-[8px] tracking-[0.15em] text-[#79715F]">WKS≥TGT</div>
                  </div>
                </div>
                {active && (
                  <div className="num mt-3 border-t border-[#D9D1C0] pt-2 text-[8.5px] tracking-[0.25em] text-[#1C6B4A]">
                    ● LOADED IN TERMINAL
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
