import { PortfolioList } from "@/components/portfolio-list";

export default function PortfolioPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Open and settled positions for the connected wallet.</p>
      </div>
      <PortfolioList />
    </div>
  );
}
