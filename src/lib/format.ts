export function fmtPct(v: number, digits = 2, signed = true): string {
  const s = v * 100;
  const sign = signed && s > 0 ? "+" : "";
  return `${sign}${s.toFixed(digits)}%`;
}

export function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtNum(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

export function fmtPrice(v: number): string {
  if (v >= 10000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 100) return v.toFixed(1);
  return v.toFixed(2);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" });
}
