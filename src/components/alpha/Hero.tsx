"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Flame, LineChart, ShieldCheck } from "lucide-react";
import { CountUp } from "./CountUp";
import { LiveFeed } from "./LiveFeed";
import { fmtPct } from "@/lib/format";

function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    interface Candle { x: number; y: number; body: number; wick: number; up: boolean; speed: number; scale: number }
    const candles: Candle[] = [];
    const N = 26;
    let seed = 1234567;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < N; i++) {
      candles.push({
        x: rnd() * 1.15,
        y: 0.12 + rnd() * 0.76,
        body: 10 + rnd() * 34,
        wick: 8 + rnd() * 26,
        up: rnd() > 0.42,
        speed: 0.00022 + rnd() * 0.00042,
        scale: 0.6 + rnd() * 0.9,
      });
    }

    const pts: number[] = [];
    const PTS = 220;
    let val = 0.55;
    for (let i = 0; i < PTS; i++) {
      val += (rnd() - 0.485) * 0.03;
      val = Math.min(0.9, Math.max(0.15, val));
      pts.push(val);
    }

    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(w * 0.62, h * 0.32, 0, w * 0.62, h * 0.32, w * 0.55);
      g.addColorStop(0, "rgba(28,107,73,0.06)");
      g.addColorStop(0.5, "rgba(14,124,134,0.03)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (const c of candles) {
        c.x -= c.speed * (reduced ? 0 : 1);
        if (c.x < -0.05) {
          c.x = 1.05 + rnd() * 0.1;
          c.y = 0.12 + rnd() * 0.76;
          c.up = rnd() > 0.42;
        }
        const x = c.x * w;
        const y = c.y * h;
        const bh = c.body * c.scale;
        const wh = c.wick * c.scale;
        const col = c.up ? "rgba(28,107,73,0.16)" : "rgba(194,65,59,0.13)";
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - wh);
        ctx.lineTo(x, y + wh);
        ctx.stroke();
        ctx.fillStyle = col;
        const bw = 7 * c.scale;
        ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
      }

      if (!reduced && t % 3 === 0) {
        pts.shift();
        let nv = (pts[pts.length - 1] ?? 0.55) + (rnd() - 0.487) * 0.035;
        nv = Math.min(0.92, Math.max(0.12, nv));
        pts.push(nv);
      }
      const step = w / (PTS - 30);
      ctx.save();
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = i * step;
        const y = h * (1 - p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "rgba(28,107,73,0.9)";
      ctx.lineWidth = 1.6;
      ctx.shadowColor = "rgba(28,107,73,0.6)";
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      const hx = (pts.length - 1) * step;
      const hy = h * (1 - (pts[pts.length - 1] ?? 0.5));
      ctx.save();
      ctx.fillStyle = "#1C6B4A";
      ctx.shadowColor = "rgba(28,107,73,0.9)";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(hx, hy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

const heroStats = [
  { label: "WEEKS POSITIVE · TAPE 42", value: 0.78, fmt: (v: number) => fmtPct(v, 0, false) },
  { label: "SHARPE · ENSEMBLE", value: 2.45, fmt: (v: number) => v.toFixed(2) },
  { label: "CAGR · BALANCED CONFIG", value: 0.107, fmt: (v: number) => fmtPct(v, 1) },
  { label: "LIVE INSTRUMENTS TRACKED", value: 42, fmt: (v: number) => `${Math.round(v)}` },
];

export function Hero() {
  return (
    <header className="relative flex min-h-[86svh] flex-col overflow-hidden">
      <HeroCanvas />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#EAE6DC]/30 via-transparent to-[#EAE6DC]" />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pt-16 md:px-12">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="num mb-6 max-w-xl text-[11px] leading-relaxed tracking-[0.3em] text-[#0E7C86]"
        >
          [ LIVE FEEDS · ALGO SIGNALS · EXPERT PICKS · PAPER BROKER ]
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-5xl text-[13vw] font-bold leading-[0.92] tracking-tight text-[#1C1A13] md:text-[6rem]"
        >
          CONSISTENCY
          <br />
          IS THE ONLY
          <br />
          <span className="glow-acid text-[#1C6B4A]">ALPHA.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="mt-8 max-w-xl text-[15px] leading-relaxed text-[#5A5344] md:text-base"
        >
          Four institutional trading models, real-time exchange feeds, and a Monte Carlo core
          that tells you the exact <span className="text-[#1C1A13]">probability of beating your weekly target</span>.
          Then it routes your conviction into live picks, orders and a paper book you can grow into real code.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <a
            href="/markets"
            className="group inline-flex items-center gap-3 border border-[#1C6B4A] bg-[#1C6B4A] px-7 py-3.5 text-[12px] font-bold tracking-[0.2em] text-[#F2EEE3] transition-all hover:bg-transparent hover:text-[#1C6B4A]"
          >
            <Flame className="h-4 w-4" />
            LIVE MARKETS
          </a>
          <a
            href="/picks"
            className="inline-flex items-center gap-3 border border-[#D9D1C0] px-7 py-3.5 text-[12px] tracking-[0.2em] text-[#5A5344] transition-all hover:border-[#0E7C86]/60 hover:text-[#0E7C86]"
          >
            <ShieldCheck className="h-4 w-4" />
            ALGO PICKS
          </a>
          <a
            href="#lab"
            className="inline-flex items-center gap-3 border border-[#D9D1C0] px-7 py-3.5 text-[12px] tracking-[0.2em] text-[#5A5344] transition-all hover:border-[#1C6B4A]/60 hover:text-[#1C6B4A]"
          >
            <LineChart className="h-4 w-4" />
            THE BACKTEST LAB
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.75 }}
        className="pointer-events-none absolute right-6 top-[57%] z-10 hidden -translate-y-1/2 xl:block 2xl:right-16"
      >
        <LiveFeed />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.65 }}
        className="relative z-10 grid grid-cols-2 border-t border-[#D9D1C0] bg-[#EAE6DC]/85 md:grid-cols-4"
      >
        {heroStats.map((s, i) => (
          <div key={s.label} className={`px-6 py-5 md:px-10 ${i !== 0 ? "border-l border-[#D9D1C0]" : ""}`}>
            <div className="num text-xl font-semibold text-[#1C1A13] md:text-2xl">
              <CountUp value={s.value} format={s.fmt} duration={1600} />
            </div>
            <div className="num mt-1 text-[9px] tracking-[0.25em] text-[#79715F]">{s.label}</div>
          </div>
        ))}
      </motion.div>

      <a
        href="#lab"
        className="absolute bottom-28 left-1/2 z-10 hidden -translate-x-1/2 text-[#79715F] transition-colors hover:text-[#1C6B4A] md:block"
      >
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </a>
    </header>
  );
}
