"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
import { CRYPTO_STREAMS } from "@/lib/market/live";
import { fmtPrice } from "@/lib/format";

interface FeedLine {
  id: number;
  time: string;
  tag: string;
  tagCls: string;
  text: string;
}

const TAGS: [string, string][] = [
  ["FILL", "text-[#1C6B4A]"],
  ["QUOTE", "text-[#79715F]"],
  ["SIGNAL", "text-[#0E7C86]"],
  ["RISK", "text-[#A3722A]"],
  ["STOP", "text-[#C2413B]"],
];

function nextLine(id: number, clock: number): FeedLine {
  const c = CRYPTO_STREAMS[Math.floor(Math.random() * CRYPTO_STREAMS.length)]!;
  const r = Math.random();
  const tagIdx = r < 0.34 ? 0 : r < 0.58 ? 1 : r < 0.78 ? 2 : r < 0.9 ? 3 : 4;
  const [tag, tagCls] = TAGS[tagIdx]!;
  const px = c.price;

  let text = "";
  if (tag === "FILL") text = `${c.name} mkt ${Math.random() > 0.5 ? "buy" : "sell"} ${(Math.random() * 4 + 0.2).toFixed(3)} @ ${fmtPrice(px)}`;
  if (tag === "QUOTE") text = `${c.symbol} ${fmtPrice(px)} × ${(Math.random() * 900 + 100).toFixed(0)} · spread ${(Math.random() * 6 + 0.5).toFixed(1)}bp`;
  if (tag === "SIGNAL") text = `${c.symbol} ${["ema cross confirm", "momentum +", "z-score stretch", "channel break", "vol regime shift"][Math.floor(Math.random() * 5)]} · conf ${(Math.random() * 0.4 + 0.55).toFixed(2)}`;
  if (tag === "RISK") text = `gross ${(Math.random() * 1.2 + 0.6).toFixed(2)}× · book vol ${(Math.random() * 8 + 4).toFixed(1)}% · dd -${(Math.random() * 4).toFixed(2)}%`;
  if (tag === "STOP") text = `${c.symbol} trail ratchet → ${fmtPrice(px * 0.985)} (lock ${(Math.random() * 6 + 1).toFixed(1)}%)`;

  const t = new Date(clock);
  const time = `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}:${String(t.getUTCSeconds()).padStart(2, "0")}`;
  return { id, time, tag, tagCls, text };
}

export function LiveFeed() {
  const [lines, setLines] = useState<FeedLine[]>([]);
  const clockRef = useRef(Date.now());
  const idRef = useRef(0);

  useEffect(() => {
    const seed: FeedLine[] = [];
    for (let i = 0; i < 7; i++) {
      clockRef.current -= Math.floor(Math.random() * 1400 + 300);
      seed.push(nextLine(idRef.current++, clockRef.current));
    }
    setLines(seed.reverse());

    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      clockRef.current += Math.floor(Math.random() * 1600 + 240);
      const line = nextLine(idRef.current++, clockRef.current);
      setLines((prev) => [line, ...prev].slice(0, 9));
      timer = setTimeout(tick, Math.floor(Math.random() * 900 + 550));
    };
    timer = setTimeout(tick, 800);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="card w-[350px] p-4">
      <div className="num mb-3 flex items-center justify-between text-[9px] tracking-[0.25em] text-[#79715F]">
        <span className="flex items-center gap-2 text-[#1C6B4A]">
          <Radio className="h-3 w-3" />
          ORDERFLOW · ENGINE TAPE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="blink-dot h-1.5 w-1.5 rounded-full bg-[#1C6B4A]" />
          STREAMING
        </span>
      </div>
      <div className="num space-y-[7px] text-[10px] leading-none">
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-baseline gap-2 whitespace-nowrap"
            >
              <span className="text-[#8A8272]">{l.time}</span>
              <span className={`w-[44px] shrink-0 font-bold tracking-wider ${l.tagCls}`}>{l.tag}</span>
              <span className="truncate text-[#5A5344]">{l.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
