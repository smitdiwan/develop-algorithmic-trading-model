import { LineChart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#D9D1C0] px-6 py-10 md:px-12">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-[#1C6B4A]/60 bg-[#1C6B4A]/10">
            <LineChart className="h-4 w-4 text-[#1C6B4A]" />
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-bold tracking-[0.22em] text-[#1C1A13]">ALPHA//FORGE</div>
            <div className="num mt-0.5 text-[8.5px] tracking-[0.3em] text-[#79715F]">
              BUILT FOR THE OBSESSIVE · {new Date().getFullYear()}
            </div>
          </div>
        </div>
        <p className="num max-w-2xl text-[9px] leading-relaxed tracking-[0.1em] text-[#8A8272]">
          RESEARCH TERMINAL · LIVE MARKET FEEDS · ALGO SIGNALS · POSTGRESQL PERSISTENCE.
          NOT FINANCIAL ADVICE. PAST PERFORMANCE — REAL OR SIMULATED — DOES NOT GUARANTEE FUTURE RESULTS.
        </p>
        <div className="num flex items-center gap-2 text-[9px] tracking-[0.25em] text-[#1C6B4A]">
          <span className="blink-dot h-1.5 w-1.5 rounded-full bg-[#1C6B4A]" />
          ALL SYSTEMS NOMINAL
        </div>
      </div>
    </footer>
  );
}
