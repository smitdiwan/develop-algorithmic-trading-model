"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart } from "lucide-react";

const LINKS = [
  { href: "/", label: "TERMINAL" },
  { href: "/markets", label: "MARKETS" },
  { href: "/picks", label: "PICKS" },
  { href: "/portfolio", label: "PORTFOLIO" },
  { href: "/connect", label: "CONNECT" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-[#D9D1C0] bg-[#EAE6DC]/95">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-[#1C6B4A]/60 bg-[#1C6B4A]/10">
            <LineChart className="h-4 w-4 text-[#1C6B4A]" strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-bold tracking-[0.22em] text-[#1C1A13]">ALPHA//FORGE</div>
            <div className="num text-[8px] tracking-[0.3em] text-[#79715F]">CONSISTENCY ENGINE</div>
          </div>
        </Link>

        <div className="num flex items-center gap-1 text-[10px] tracking-[0.18em] md:gap-2">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`border px-2 py-1.5 transition-colors md:px-3 ${
                  active
                    ? "border-[#1C6B4A]/60 bg-[#1C6B4A]/10 text-[#1C6B4A]"
                    : "border-transparent text-[#79715F] hover:border-[#D9D1C0] hover:text-[#1C1A13]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="num hidden items-center gap-2 text-[9px] tracking-[0.25em] text-[#1C6B4A] lg:flex">
          <span className="blink-dot inline-block h-1.5 w-1.5 rounded-full bg-[#1C6B4A]" />
          LIVE
        </div>
      </div>
    </nav>
  );
}
