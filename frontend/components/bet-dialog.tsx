"use client";

import { useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { parseSol } from "@/lib/format";
import { useAppStore } from "@/lib/store";

const quickAmounts = ["0.01", "0.05", "0.1", "0.5"];

export function BetDialog() {
  const selectedBet = useAppStore((state) => state.selectedBet);
  const closeBet = useAppStore((state) => state.closeBet);
  const wallet = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState<string | null>(null);

  if (!selectedBet) return null;

  async function submit() {
    if (!selectedBet) return;
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("Connect Phantom first.");
      return;
    }
    if (!selectedBet.marketExists) {
      setStatus("This market is not initialized yet.");
      return;
    }
    if (!selectedBet.oddsPrice || !selectedBet.oddsMessageId || !selectedBet.oddsTs) {
      setStatus("Odds are not available for this outcome yet.");
      return;
    }

    try {
      setStatus("Fetching TxODDS proof");
      const proofResponse = await fetch(
        `/api/odds/proof?messageId=${encodeURIComponent(selectedBet.oddsMessageId)}&ts=${encodeURIComponent(String(selectedBet.oddsTs))}`
      );
      const proofPayload = await proofResponse.json();
      if (!proofResponse.ok) throw new Error(proofPayload.error ?? "Unable to fetch odds proof.");

      const dailyOddsMerkleRoots =
        proofPayload.dailyOddsMerkleRoots ??
        proofPayload.proof?.dailyOddsMerkleRoots ??
        proofPayload.proof?.daily_odds_merkle_roots ??
        proofPayload.proof?.accounts?.daily_odds_merkle_roots;

      if (!dailyOddsMerkleRoots) {
        throw new Error("TxODDS proof response did not include the daily odds Merkle roots account.");
      }

      setStatus("Building transaction");
      const response = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: wallet.publicKey.toBase58(),
          fixtureId: selectedBet.fixtureId,
          marketType: selectedBet.marketType,
          outcomeIndex: selectedBet.outcomeIndex,
          stakeLamports: parseSol(amount).toString(),
          oddsPrice: selectedBet.oddsPrice,
          oddsProof: proofPayload.proof,
          dailyOddsMerkleRoots
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4">
      <section className="w-full max-w-sm rounded-md border border-white/10 bg-[#121821] p-4 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{selectedBet.title}</div>
            <div className="mt-1 text-xs text-white/55">Buy {selectedBet.outcomeLabel}</div>
          </div>
          <button
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-white/70 hover:text-white"
            onClick={closeBet}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="sr-only">Bet amount</span>
          <div className="flex items-center justify-center rounded-md bg-transparent">
            <span className="text-3xl font-bold text-white/65">◎</span>
            <input
              autoFocus
              className="w-28 bg-transparent text-center text-6xl font-bold text-white outline-none"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <span className="text-center text-xs text-white/45">devnet SOL from your wallet</span>
        </label>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              className="h-10 rounded-md bg-white/8 text-sm font-semibold text-white hover:bg-white/14"
              onClick={() => setAmount(value)}
              type="button"
            >
              {value} SOL
            </button>
          ))}
        </div>

        <Button className="mt-3 h-12 w-full bg-[var(--accent)] hover:bg-[#159447]" onClick={submit}>
          Buy {selectedBet.outcomeLabel}
        </Button>
        {status && <p className="mt-3 break-all text-xs text-white/55">{status}</p>}
      </section>
    </div>
  );
}
