import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/space-grotesk/300.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/300.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALPHAFORGE — Live Algorithmic Trading Terminal",
  description:
    "Live market data, algo buy/sell signals, expert picks with source attribution, broker connect and backtesting — a full algorithmic trading research terminal.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#EAE6DC] text-[#1C1A13] antialiased">{children}</body>
    </html>
  );
}
