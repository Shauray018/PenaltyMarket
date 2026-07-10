"use client";

import { useEffect, useState } from "react";
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
  const showToast = useAppStore((state) => state.showToast);
  const wallet = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBet) return;
    setAmount(String(selectedBet.stakeSol ?? 0));
    setStatus(null);
  }, [selectedBet]);

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
      const latestOdds = await fetchLatestOdds(selectedBet.fixtureId, selectedBet.marketType);
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
      showToast({
        title: "Bet Confirmed",
        message: `${amount} SOL on ${selectedBet.outcomeLabel} was sent to devnet.`,
        signature,
        href: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Bet failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 px-4">
      <section className="win95-window w-full max-w-sm">
        <div className="win95-titlebar">
          <span>VAR_CONFIRM.EXE</span>
          <button
            aria-label="Close"
            className="grid h-[18px] w-[18px] place-items-center border-b-2 border-r-2 border-b-[#404040] border-r-[#404040] border-l-2 border-t-2 border-l-white border-t-white bg-[#c0c0c0] text-black"
            onClick={closeBet}
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="win95-window-body grid gap-4">
          <div className="win95-panel-inset flex items-start gap-3 bg-[#efefdf] p-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border-2 border-[#808080] bg-white">
              {outcomeFlag ? (
                <img alt="" className="h-12 w-12 object-cover" src={outcomeFlag} />
              ) : (
                <span className="text-sm font-black text-black">{outcomeMark}</span>
              )}
            </div>
            <div>
              <div className="text-base font-black">{selectedBet.title}</div>
              <div className="mt-1 text-xs font-black uppercase text-[var(--muted)]">Buy {selectedBet.outcomeLabel}</div>
            </div>
          </div>

        <label className="grid gap-2">
          <span className="sr-only">Bet amount</span>
          <div className="win95-panel-inset grid place-items-center bg-white p-3">
            <input
              autoFocus
              className="w-44 bg-transparent text-center text-5xl font-black text-black outline-none"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="text-center text-sm font-black text-[#000080]">
            {payout > 0 ? payout.toFixed(3) : "0.000"} SOL payout if right
          </div>
          <span className="text-center text-xs font-bold text-[var(--muted)]">devnet SOL from your wallet</span>
        </label>

        <div className="grid grid-cols-4 gap-1">
          {quickAmounts.map((value) => (
            <button
              key={value}
              className="win95-button min-w-0 px-1 text-xs"
              onClick={() => setAmount(value)}
              type="button"
            >
              {value} SOL
            </button>
          ))}
        </div>

        <Button className="win95-button-primary w-full" onClick={submit}>
          Buy {selectedBet.outcomeLabel}
        </Button>
        {status && <p className="win95-panel-inset break-all bg-white p-2 text-xs font-bold text-[var(--muted)]">{status}</p>}
        </div>
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

async function fetchLatestOdds(fixtureId: string, marketType: number) {
  const response = await fetch(`/api/odds/${fixtureId}?mode=updates&marketType=${marketType}`);
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
