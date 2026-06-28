"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
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

  if (!wallet.publicKey) return <Panel>Connect Phantom to view your positions.</Panel>;
  if (isLoading) return <Panel>Loading positions</Panel>;
  if (!data?.positions.length) return <Panel>No positions found for {shortKey(wallet.publicKey.toBase58())}.</Panel>;

  return (
    <div className="grid gap-3">
      {data.positions.map((item) => {
        const resolved = Boolean(item.market?.status?.resolved);
        const winner = item.market?.winningOutcome === item.position.outcomeIndex;
        const claimable = resolved && winner && !item.position.claimed;

        return (
          <Panel key={item.publicKey} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="font-medium">Fixture {item.market?.fixtureId ?? "unknown"}</div>
              <div className="text-sm text-[var(--muted)]">Market {shortKey(item.marketPublicKey)}</div>
              <div className="mt-2 text-sm">
                Outcome {item.position.outcomeIndex} · stake {formatSol(item.position.stakeLamports)} · pays {formatSol(item.position.payoutLamports)}
              </div>
            </div>
            {claimable ? (
              <ClaimButton market={item.marketPublicKey} position={item.publicKey} />
            ) : (
              <div className="text-sm text-[var(--muted)]">{item.position.claimed ? "Claimed" : resolved ? "Settled" : "Open"}</div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
