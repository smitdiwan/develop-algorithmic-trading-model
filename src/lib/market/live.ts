"use client";

import { useEffect, useRef, useState } from "react";
import { CRYPTO_STREAMS, wsUrlFor, type Ticker, type TickerMap } from "./streams";

export { CRYPTO_STREAMS, wsUrlFor, anyLive } from "./streams";
export type { StreamDef, Ticker, TickerMap } from "./streams";

/**
 * Live market data client.
 *
 * Crypto: Binance public WebSocket (no key required) — real ticks.
 * Falls back to a seeded tape (live:false) if the socket and REST snapshot
 * are both unreachable, so the UI degrades honestly instead of freezing.
 */
export function useLiveTickers(symbols: string[]): TickerMap {
  const [map, setMap] = useState<TickerMap>({});
  const liveRef = useRef(true);

  useEffect(() => {
    if (symbols.length === 0) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    const seedLocal = () => {
      setMap((prev) => {
        const next: TickerMap = { ...prev };
        for (const s of symbols) {
          if (!next[s]) {
            const def = CRYPTO_STREAMS.find((c) => c.symbol === s);
            const base = def?.price ?? 100;
            const drift = (Math.random() - 0.5) * 0.006;
            next[s] = { price: base * (1 + drift), changePct: drift * 100, live: false };
          }
        }
        return next;
      });
    };
    seedLocal();

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrlFor(symbols));
        ws.onopen = () => {
          liveRef.current = true;
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string) as {
              data?: { s: string; c: string; o: string };
            };
            const d = msg.data;
            if (!d?.s || !d.c) return;
            const close = parseFloat(d.c);
            const open = parseFloat(d.o);
            const chg = open > 0 ? (close / open - 1) * 100 : 0;
            setMap((prev) => ({ ...prev, [d.s]: { price: close, changePct: chg, live: true } }));
          } catch {
            /* ignore malformed frame */
          }
        };
        ws.onerror = () => {
          liveRef.current = false;
        };
        ws.onclose = () => {
          if (closed) return;
          liveRef.current = false;
          retry = setTimeout(connect, 6000);
        };
      } catch {
        liveRef.current = false;
      }
    };
    connect();

    const restTick = async () => {
      try {
        const q = symbols.map((s) => `"${s}"`).join(",");
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${q}]`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        const rows = (await res.json()) as {
          symbol: string;
          lastPrice: string;
          priceChangePercent: string;
        }[];
        setMap((prev) => {
          const next = { ...prev };
          for (const r of rows) {
            next[r.symbol] = {
              price: parseFloat(r.lastPrice),
              changePct: parseFloat(r.priceChangePercent),
              live: true,
            };
          }
          return next;
        });
      } catch {
        /* network blocked — local tape keeps the UI alive */
      }
    };
    restTick();
    const poll = setInterval(restTick, 15000);

    return () => {
      closed = true;
      clearInterval(poll);
      clearTimeout(retry);
      try {
        ws?.close();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]);

  return map;
}
