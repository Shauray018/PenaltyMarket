"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Send } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { getMarketType } from "@/lib/constants";
import { parseSol } from "@/lib/format";

type Market = {
  publicKey: string;
  marketType: { index: number; label: string; options: readonly string[] };
  exists: boolean;
    account: null | {
      options?: string[];
      outcomeStakes?: string[];
      totalStaked?: string;
      status?: Record<string, unknown>;
    };
};

export function BetTicket({ fixtureId, markets }: { fixtureId: string; markets: Market[] }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [marketType, setMarketType] = useState(0);
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [amount, setAmount] = useState("1");
  const [status, setStatus] = useState<string | null>(null);

  const selected = useMemo(() => markets.find((market) => market.marketType.index === marketType), [markets, marketType]);
  const options = selected?.account?.options?.length ? selected.account.options : getMarketType(marketType)?.options ?? [];
  const canBet = false;

  async function submit() {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("Connect Phantom first.");
      return;
    }

    try {
      setStatus("Building transaction");
      const response = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: wallet.publicKey.toBase58(),
          fixtureId,
          marketType,
          outcomeIndex,
          stakeLamports: parseSol(amount).toString()
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to build transaction.");

      const tx = Transaction.from(Buffer.from(payload.transaction, "base64"));
      const signed = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      setStatus(`Sent ${signature}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Bet failed.");
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-[var(--muted)]">Market</span>
        <select
          className="h-10 rounded-md border border-[var(--border)] bg-white px-3"
          value={marketType}
          onChange={(event) => {
            setMarketType(Number(event.target.value));
            setOutcomeIndex(0);
          }}
        >
          {markets.map((market) => (
            <option key={market.marketType.index} value={market.marketType.index}>
              {market.marketType.label}
              {market.exists ? "" : " (not initialized)"}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option, index) => (
          <button
            key={option}
            className={`h-11 rounded-md border px-3 text-sm font-semibold transition ${
              outcomeIndex === index ? "border-black bg-black text-white" : "border-[var(--border)] bg-white hover:border-[var(--accent)]"
            }`}
            onClick={() => setOutcomeIndex(index)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>

      <label className="grid gap-1 text-sm">
        <span className="text-[var(--muted)]">Amount</span>
        <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>

      <Button className="h-11 gap-2" disabled={!canBet} onClick={submit}>
        <Send className="h-4 w-4" />
        Place bet
      </Button>
      {!selected?.exists && <p className="text-sm text-[var(--muted)]">This market PDA has not been initialized yet.</p>}
      {selected?.exists && (
        <p className="text-sm text-[var(--muted)]">
          Fixed-odds bets also require a TxODDS proof, so the market cards are the primary betting flow for now.
        </p>
      )}
      {status && <p className="break-all text-sm text-[var(--muted)]">{status}</p>}
    </div>
  );
}
