import { AppNav } from "@/components/nav/AppNav";
import { Footer } from "@/components/alpha/Footer";
import { PageHeader } from "@/components/nav/PageHeader";
import { PortfolioBoard } from "@/components/portfolio/PortfolioBoard";

export const metadata = {
  title: "Portfolio — ALPHAFORGE",
  description: "Your positions with live P&L, persisted in PostgreSQL.",
};

export default function PortfolioPage() {
  return (
    <main className="grid-bg min-h-screen">
      <AppNav />
      <section className="mx-auto max-w-[1440px] px-6 py-12 md:px-12">
        <PageHeader
          index="03"
          accent="PAPER BROKER"
          title="Your book, ticking."
          blurb="Orders routed from the picks desk land here, marked against live prices and persisted in PostgreSQL. Close a position and the realised P&L moves into history."
          right={
            <a
              href="/picks"
              className="num border border-[#1C6B4A] bg-[#1C6B4A] px-5 py-2.5 text-[11px] font-bold tracking-[0.2em] text-[#F2EEE3] transition-colors hover:bg-transparent hover:text-[#1C6B4A]"
            >
              ROUTE A NEW SIGNAL
            </a>
          }
        />
        <PortfolioBoard />
      </section>
      <Footer />
    </main>
  );
}
