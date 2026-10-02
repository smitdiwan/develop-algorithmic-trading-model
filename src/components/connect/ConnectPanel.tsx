"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";

interface Conn {
  id: string;
  venue: string;
  apiKeyMasked: string;
  status: string;
  createdAt: string;
}

const VENUES = [
  {
    id: "COINDCX",
    name: "CoinDCX",
    blurb: "Indian exchange · INR-M futures & spot · HMAC-SHA256 signed REST.",
    docs: "https://coindcx.com/",
  },
  {
    id: "GROWW",
    name: "Groww",
    blurb: "Indian broker · stocks, F&O, mutual funds · bearer access token.",
    docs: "https://groww.in/",
  },
  {
    id: "BINANCE",
    name: "Binance",
    blurb: "Global crypto · spot & USDT-M futures · X-MBX-APIKEY + HMAC.",
    docs: "https://binance-docs.github.io/",
  },
  {
    id: "MEXC",
    name: "MEXC",
    blurb: "Global crypto · low-fee spot · X-MEXC-APIKEY + HMAC sign.",
    docs: "https://mexc.gitbook.io/",
  },
];

const SNIPPET = `// ─── ALPHAFORGE → CoinDCX: place a market order ───────────────
// Keys live server-side only (see ConnectPanel). Never ship them to the browser.
import crypto from "node:crypto";

export async function placeOrder({ side, pair, quantity }) {
  const body = JSON.stringify({
    side,                 // "buy" | "sell"
    pair,                 // "BTC_USDT"
    type: "market",
    order_type: "market_order",
    quantity,             // base quantity
    timestamp: Date.now(),
  });

  const signature = crypto
    .createHmac("sha256", process.env.COINDCX_SECRET)
    .update(body)
    .digest("hex");

  const res = await fetch("https://api.coindcx.com/exchange/v1/orders/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AUTH-APIKEY": process.env.COINDCX_KEY,
      "X-AUTH-SIGNATURE": signature,
    },
    body,
  });
  return res.json(); // { order_id, status, ... }
}

// ─── Binance variant (query-string signing) ───────────────────
// const qs = "symbol=BTCUSDT&side=BUY&type=MARKET&timestamp=" + Date.now();
// const sig = crypto.createHmac("sha256", process.env.BINANCE_SECRET).update(qs).digest("hex");
// fetch("https://api.binance.com/api/v3/order?" + qs + "&signature=" + sig, {
//   method: "POST", headers: { "X-MBX-APIKEY": process.env.BINANCE_KEY },
// });`;

export function ConnectPanel() {
  const [conns, setConns] = useState<Conn[]>([]);
  const [venue, setVenue] = useState("COINDCX");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/connect");
      const json = (await res.json()) as { connections?: Conn[] };
      setConns(json.connections ?? []);
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue, apiKey, secret }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setApiKey("");
      setSecret("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (id: string) => {
    setConns((c) => c.filter((x) => x.id !== id));
    await fetch("/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect", id }),
    }).catch(() => {});
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="space-y-8">
      {/* vault */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <div className="num mb-4 flex items-center gap-2 text-[10px] tracking-[0.25em] text-[#79715F]">
            <KeyRound className="h-3.5 w-3.5 text-[#1C6B4A]" /> KEY VAULT · SERVER-SIDE ONLY
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {VENUES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVenue(v.id)}
                className={`num border px-3 py-1.5 text-[10px] tracking-[0.14em] transition-all ${
                  venue === v.id ? "border-[#1C6B4A] bg-[#1C6B4A]/10 text-[#1C6B4A]" : "border-[#D9D1C0] text-[#79715F]"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>

          <label className="num mb-1.5 block text-[10px] tracking-[0.2em] text-[#79715F]">API KEY</label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="paste public key"
            className="num mb-3 w-full border border-[#D9D1C0] bg-[#F2EEE3] px-3 py-2.5 text-[12px] text-[#1C1A13] outline-none focus:border-[#1C6B4A]"
          />
          <label className="num mb-1.5 block text-[10px] tracking-[0.2em] text-[#79715F]">SECRET</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="paste secret — never leaves the server"
            className="num mb-4 w-full border border-[#D9D1C0] bg-[#F2EEE3] px-3 py-2.5 text-[12px] text-[#1C1A13] outline-none focus:border-[#1C6B4A]"
          />

          {err && <p className="num mb-3 text-[11px] text-[#C2413B]">{err}</p>}

          <button
            onClick={save}
            disabled={busy || !apiKey || !secret}
            className="flex w-full items-center justify-center gap-2 bg-[#1C6B4A] py-3 text-[11px] font-bold tracking-[0.25em] text-[#F2EEE3] transition-colors hover:bg-[#14553a] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            SECURE CONNECTION
          </button>

          <div className="num mt-4 space-y-2 border-t border-[#D9D1C0] pt-3 text-[10px]">
            {conns.length === 0 ? (
              <div className="text-[#8A8272]">NO VENUES CONNECTED YET</div>
            ) : (
              conns.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-[#1C1A13]">
                    <span className="text-[#1C6B4A]">●</span> {c.venue}{" "}
                    <span className="text-[#8A8272]">{c.apiKeyMasked}</span>
                  </span>
                  <button
                    onClick={() => disconnect(c.id)}
                    className="flex items-center gap-1 text-[#8A8272] transition-colors hover:text-[#C2413B]"
                  >
                    <Trash2 className="h-3 w-3" /> REVOKE
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          {VENUES.map((v) => (
            <a
              key={v.id}
              href={v.docs}
              target="_blank"
              rel="noreferrer"
              className="card card-hover flex items-center justify-between p-4"
            >
              <div>
                <div className="num text-[11px] font-bold tracking-[0.18em] text-[#1C1A13]">{v.name}</div>
                <div className="mt-1 text-[12px] text-[#5A5344]">{v.blurb}</div>
              </div>
              <span className="num text-[10px] tracking-[0.15em] text-[#1C6B4A]">DOCS →</span>
            </a>
          ))}
        </div>
      </div>

      {/* code */}
      <div>
        <div className="num mb-3 flex items-center justify-between text-[10px] tracking-[0.25em] text-[#79715F]">
          <span>YOUR OWN EXECUTION CODE · COPY & PASTE</span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 border border-[#D9D1C0] px-3 py-1.5 text-[10px] text-[#79715F] transition-colors hover:border-[#1C6B4A]/60 hover:text-[#1C6B4A]"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>
        <pre className="scroll-thin card overflow-x-auto p-5 text-[11.5px] leading-relaxed">
          <code className="num text-[#1C1A13]">{SNIPPET}</code>
        </pre>
        <p className="num mt-3 text-[9.5px] leading-relaxed text-[#8A8272]">
          SIGNING SCHEMES FOLLOW EACH VENUE'S PUBLIC DOCS. TEST WITH DUST-SIZED ORDERS FIRST, SET IP
          WHITELISTS ON THE EXCHANGE, AND NEVER EXPOSE A SECRET TO CLIENT-SIDE CODE.
        </p>
      </div>
    </div>
  );
}
