"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Cpu, FlaskConical, Landmark } from "lucide-react";
import { STRATEGY_META, strategyIds } from "@/lib/quant/strategies";
import { SectionHeading } from "./SectionHeading";

const pillars = [
  {
    icon: <Cpu className="h-5 w-5" />,
    title: "EVENT-DRIVEN ENGINE",
    body: "Signals are computed on the close and executed at the next session's open — strictly no lookahead. Positions are sized from realised volatility, stopped by ATR trailed exits, and flattened by a drawdown kill-switch.",
  },
  {
    icon: <Landmark className="h-5 w-5" />,
    title: "INSTITUTIONAL COST MODEL",
    body: "Every fill pays configurable commissions and slippage; leveraged exposure pays daily financing. If an edge can't survive costs, the engine lets it die — exactly like the real market does.",
  },
  {
    icon: <FlaskConical className="h-5 w-5" />,
    title: "MONTE CARLO CONSISTENCY",
    body: "We block-bootstrap thousands of weeks from the run's own daily returns — preserving autocorrelation and vol clustering — to measure P(next week ≥ target) and the full 52-week percentile fan.",
  },
];

const reveal = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
} as const;

export function Methodology() {
  return (
    <section id="method" className="relative border-t border-[#D9D1C0] px-6 py-24 md:px-12">
      <SectionHeading index="02" accent="RESEARCH METHOD" title="No magic. Just math." />

      <div className="grid gap-2 md:grid-cols-3">
        {pillars.map((p, i) => (
          <motion.div
            key={p.title}
            {...reveal}
            transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
            className="card card-hover p-6"
          >
            <div className="mb-4 inline-flex border border-[#1C6B4A]/40 bg-[#1C6B4A]/10 p-2.5 text-[#1C6B4A]">{p.icon}</div>
            <div className="num mb-2.5 text-[11px] tracking-[0.25em] text-[#1C1A13]">{p.title}</div>
            <p className="text-[13px] leading-relaxed text-[#5A5344]">{p.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-14 grid gap-2 md:grid-cols-2">
        {strategyIds.map((id, i) => (
          <motion.div
            key={id}
            {...reveal}
            transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
            className="card p-6"
          >
            <div className="num mb-1 flex items-center justify-between">
              <span className="text-[11px] tracking-[0.25em] text-[#1C6B4A]">{STRATEGY_META[id].label.toUpperCase()}</span>
              <span className="text-[9px] tracking-[0.2em] text-[#8A8272]">MODEL {id.slice(0, 4).toUpperCase()}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#5A5344]">{STRATEGY_META[id].description}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        {...reveal}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="mt-14 border border-[#A3722A]/30 bg-[#A3722A]/[0.05] p-6 md:p-8"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="inline-flex h-fit border border-[#A3722A]/40 bg-[#A3722A]/10 p-2.5 text-[#A3722A]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="num mb-2 text-[11px] tracking-[0.3em] text-[#A3722A]">THE HONEST CONTRACT</div>
            <p className="max-w-4xl text-[13.5px] leading-relaxed text-[#4A4436]">
              You asked for a model that produces the same percentage every week. Here is the truth any
              serious desk will tell you: <strong className="text-[#1C1A13]">that model does not exist</strong> —
              not at Renaissance, not at Citadel, not anywhere. Returns arrive as a distribution, never
              as a salary. What <em>can</em> be engineered is the shape of that distribution:
              volatility targets, asymmetric payoffs, and deep drawdown protection. This lab measures the
              one thing that matters — the <strong className="text-[#1C6B4A]">probability</strong> that your
              weekly target is beaten — so you can size your expectations the way professionals size positions.
            </p>
            <p className="num mt-4 text-[10px] leading-relaxed tracking-[0.08em] text-[#79715F]">
              PRICES ARE REAL WHERE THE FEED IS LIVE, SYNTHETIC OTHERWISE — THE UI FLAGS WHICH IS WHICH.
              NOTHING HERE IS FINANCIAL ADVICE OR AN OFFER TO TRADE. LIVE TRADING RISKS TOTAL LOSS OF CAPITAL.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
