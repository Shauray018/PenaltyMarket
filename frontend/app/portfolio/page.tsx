import { PortfolioList } from "@/components/portfolio-list";

export default function PortfolioPage() {
  return (
    <div className="grid gap-3">
      <section className="win95-window">
        <div className="win95-titlebar">
          <span>MY_BETS.EXE</span>
          <span className="text-[10px] font-black">TICKETS</span>
        </div>
        <div className="win95-window-body">
          <h1 className="text-xl font-black uppercase">My Bets</h1>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">Open and settled positions for the connected wallet.</p>
        </div>
      </section>
      <PortfolioList />
    </div>
  );
}
