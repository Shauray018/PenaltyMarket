"use client";

import { useState } from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { parseSol } from "@/lib/format";
import { flagUrlForTeam } from "@/lib/flags";
import { useAppStore } from "@/lib/store";

const quickAmounts = ["0.01", "0.05", "0.1", "0.5"];

type OddsRecord = {
  MessageId: string;
  Ts: number;
  PriceNames?: string[];
  Prices: number[];
  Pct?: string[];
};

export function BetDialog() {
  const selectedBet = useAppStore((state) => state.selectedBet);
  const closeBet = useAppStore((state) => state.closeBet);
  const wallet = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState<string | null>(null);

  if (!selectedBet) return null;

  const oddsDecimal = selectedBet.oddsPrice ? selectedBet.oddsPrice / 1000 : 0;
  const stakeSol = Number(amount) || 0;
  const payout = Math.max(0, stakeSol * oddsDecimal - stakeSol * 0.01);
  const outcomeFlag = flagUrlForTeam(selectedBet.outcomeLabel, 64);
  const outcomeMark = outcomeInitials(selectedBet.outcomeLabel);

  async function submit() {
    if (!selectedBet) return;
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("Connect Phantom first.");
      return;
    }

    try {
      setStatus("Checking market");
      const marketResponse = await fetch(`/api/markets/${selectedBet.fixtureId}`);
      const marketPayload = await marketResponse.json();
      if (!marketResponse.ok) throw new Error(marketPayload.error ?? "Unable to verify market.");

      const selectedMarket = marketPayload.markets?.find(
        (market: { marketType?: { index?: number }; exists?: boolean }) => market.marketType?.index === selectedBet.marketType
      );
      if (selectedMarket && selectedMarket.exists === false) {
        setStatus("Market lookup is stale, trying transaction build");
      }

      setStatus("Refreshing odds");
      const latestOdds = await fetchLatestOdds(selectedBet.fixtureId);
      console.debug("BetDialog.latestOdds", latestOdds);
      const currentOddsPrice = latestOdds?.Prices?.[selectedBet.outcomeIndex] ?? selectedBet.oddsPrice;
      const currentMessageId = latestOdds?.MessageId ?? selectedBet.oddsMessageId;
      const currentTs = latestOdds?.Ts ?? selectedBet.oddsTs;

      if (!currentOddsPrice || !currentMessageId || !currentTs) {
        throw new Error("Odds are not available for this outcome yet.");
      }

      setStatus(
        `Latest odds message=${currentMessageId} ts=${currentTs} names=${latestOdds?.PriceNames?.join("/") ?? "n/a"} price=${currentOddsPrice}`
      );

      setStatus("Building demo transaction");
      const oddsProof = demoOddsProof({
        fixtureId: selectedBet.fixtureId,
        messageId: currentMessageId,
        ts: currentTs,
        prices: latestOdds?.Prices ?? [],
        priceNames: latestOdds?.PriceNames ?? ["part1", "draw", "part2"]
      });

      const response = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: wallet.publicKey.toBase58(),
          fixtureId: selectedBet.fixtureId,
          marketType: selectedBet.marketType,
          outcomeIndex: selectedBet.outcomeIndex,
          stakeLamports: parseSol(amount).toString(),
          oddsPrice: currentOddsPrice,
          oddsProof,
          demo: true
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to build transaction.");

      const rawTransaction = Buffer.from(payload.transaction, "base64");
      const tx = payload.version === "v0" ? VersionedTransaction.deserialize(rawTransaction) : Transaction.from(rawTransaction);
      const signed = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      setStatus(`Sent ${signature}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Bet failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4">
      <section className="w-full max-w-sm rounded-[16px] border border-[#141b25] bg-[#090d13] p-4 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[#17202c]">
              {outcomeFlag ? (
                <img alt="" className="h-12 w-12 object-cover" src={outcomeFlag} />
              ) : (
                <span className="text-sm font-black text-white/80">{outcomeMark}</span>
              )}
            </div>
            <div>
              <div className="text-base font-black">{selectedBet.title}</div>
              <div className="mt-1 text-sm text-white/55">Buy {selectedBet.outcomeLabel}</div>
            </div>
          </div>
          <button
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-white/70 hover:text-white"
            onClick={closeBet}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="sr-only">Bet amount</span>
          <div className="grid place-items-center">
            <input
              autoFocus
              className="w-40 bg-transparent text-center text-6xl font-black tracking-tight text-white outline-none"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="text-center text-sm font-black text-[var(--accent)]">
            ${payout > 0 ? payout.toFixed(2) : "0.00"} payout if right
          </div>
          <span className="text-center text-xs text-white/45">devnet SOL from your wallet</span>
        </label>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              className="h-10 rounded-[10px] bg-[#242a35] text-sm font-semibold text-white hover:bg-[#2d3442]"
              onClick={() => setAmount(value)}
              type="button"
            >
              {value} SOL
            </button>
          ))}
        </div>

        <Button className="mt-3 h-12 w-full border border-[#1d3824] bg-[#0d1310] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_0_#1f7a3c,0_14px_22px_rgba(31,122,60,0.18)] hover:bg-[#101915]" onClick={submit}>
          Buy {selectedBet.outcomeLabel}
        </Button>
        {status && <p className="mt-3 break-all text-xs text-white/55">{status}</p>}
      </section>
    </div>
  );
}

function demoOddsProof({
  fixtureId,
  messageId,
  ts,
  prices,
  priceNames
}: {
  fixtureId: string;
  messageId: string;
  ts: number;
  prices: number[];
  priceNames: string[];
}) {
  return {
    ts,
    oddsSnapshot: {
      fixtureId: Number(fixtureId),
      messageId,
      ts,
      bookmaker: "demo",
      bookmakerId: 0,
      superOddsType: "1X2_PARTICIPANT_RESULT",
      gameState: null,
      inRunning: false,
      marketParameters: null,
      marketPeriod: null,
      priceNames,
      prices
    },
    summary: {
      fixtureId: Number(fixtureId),
      updateStats: {
        updateCount: 0,
        minTimestamp: ts,
        maxTimestamp: ts
      },
      oddsSubTreeRoot: Array(32).fill(0)
    },
    subTreeProof: [],
    mainTreeProof: []
  };
}

async function fetchLatestOdds(fixtureId: string) {
  const response = await fetch(`/api/odds/${fixtureId}?mode=bettable`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to refresh odds.");
  }

  console.debug("fetchLatestOdds.payload", payload);

  return (payload.primary ?? null) as OddsRecord | null;
}

function outcomeInitials(label: string) {
  const normalized = label.toLowerCase();
  if (normalized === "draw") return "DRW";
  const words = label.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BET";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}
