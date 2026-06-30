"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState } from "react";
import { Panel } from "@/components/ui";
import { ClaimButton } from "@/components/claim-button";
import { formatSol, shortKey } from "@/lib/format";

type PortfolioResponse = {
  positions: Array<{
    publicKey: string;
    marketPublicKey: string;
    position: { outcomeIndex: number; stakeLamports: string; payoutLamports: string; claimed: boolean };
    market: null | { fixtureId: string; marketType: Record<string, unknown>; status: Record<string, unknown>; winningOutcome: number };
  }>;
};

export function PortfolioList() {
  const wallet = useWallet();
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const { data, isLoading } = useQuery<PortfolioResponse>({
    queryKey: ["portfolio", wallet.publicKey?.toBase58()],
    enabled: Boolean(wallet.publicKey),
    queryFn: async () => {
      const response = await fetch(`/api/portfolio?user=${wallet.publicKey?.toBase58()}`);
      if (!response.ok) throw new Error("Unable to load portfolio.");
      return response.json();
    },
    refetchInterval: 15_000
  });

  const grouped = useMemo(() => {
    const positions = data?.positions ?? [];
    return {
      active: positions.filter((item) => !item.market?.status?.resolved),
      resolved: positions.filter((item) => Boolean(item.market?.status?.resolved))
    };
  }, [data?.positions]);

  if (!wallet.publicKey) return <Panel className="text-sm font-bold text-[var(--muted)]">Connect Phantom to view your positions.</Panel>;
  if (isLoading) {
    return (
      <Panel>
        <div className="win95-progress">
          <div className="win95-progress-fill w-2/3" />
        </div>
        <div className="mt-3 text-sm font-bold text-[var(--muted)]">Loading ticket drawer</div>
      </Panel>
    );
  }
  if (!data?.positions.length) return <Panel className="text-sm font-bold text-[var(--muted)]">No tickets found for {shortKey(wallet.publicKey.toBase58())}.</Panel>;

  const visible = grouped[tab];

  return (
    <section className="win95-window">
      <div className="win95-titlebar">
        <span>BET_TICKETS.DB</span>
        <span className="text-[10px] font-black">{data.positions.length} rows</span>
      </div>
      <div className="win95-window-body grid gap-3">
        <div className="grid grid-cols-2 gap-1">
          <button className={`win95-button ${tab === "active" ? "win95-button-primary" : ""}`} type="button" onClick={() => setTab("active")}>
            Active ({grouped.active.length})
          </button>
          <button className={`win95-button ${tab === "resolved" ? "win95-button-primary" : ""}`} type="button" onClick={() => setTab("resolved")}>
            Resolved ({grouped.resolved.length})
          </button>
        </div>

        {!visible.length && (
          <div className="win95-panel-inset bg-white p-4 text-center text-sm font-bold text-[var(--muted)]">
            No {tab} tickets in this drawer.
          </div>
        )}

        <div className="grid gap-2">
      {visible.map((item) => {
        const resolved = Boolean(item.market?.status?.resolved);
        const winner = item.market?.winningOutcome === item.position.outcomeIndex;
        const claimable = resolved && winner && !item.position.claimed;

        return (
          <article key={item.publicKey} className="ticket-edge win95-panel-inset grid gap-3 bg-[#efefdf] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-[10px] font-black uppercase ${resolved ? "market-closed" : "market-open"}`}>
                  {item.position.claimed ? "Claimed" : resolved ? "Full Time" : "Open"}
                </span>
                <div className="truncate font-black">Fixture {item.market?.fixtureId ?? "unknown"}</div>
              </div>
              <div className="mt-1 text-xs font-bold text-[var(--muted)]">Market {shortKey(item.marketPublicKey)}</div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] font-black">
                <span className="bg-white p-1">Outcome {item.position.outcomeIndex}</span>
                <span className="bg-white p-1">{formatSol(item.position.stakeLamports)}</span>
                <span className="bg-white p-1">{formatSol(item.position.payoutLamports)}</span>
              </div>
            </div>
            {claimable ? (
              <ClaimButton market={item.marketPublicKey} position={item.publicKey} />
            ) : (
              <div className="text-sm font-black text-[var(--muted)]">{winner && resolved ? "Win" : resolved ? "Settled" : "In Play"}</div>
            )}
          </article>
        );
      })}
        </div>
      </div>
    </section>
  );
}
