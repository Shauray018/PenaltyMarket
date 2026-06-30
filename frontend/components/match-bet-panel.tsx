"use client";

import { useEffect, useMemo, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAppStore } from "@/lib/store";

type OddsRecord = {
  PriceNames: string[];
  Prices: number[];
  Pct: string[];
  MessageId: string;
  Ts: number;
};

export function MatchBetPanel({
  fixtureId,
  title,
  labels,
  outcomeLabels,
  marketExists = true
}: {
  fixtureId: string;
  title: string;
  labels: string[];
  outcomeLabels: string[];
  marketExists?: boolean;
}) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const openBet = useAppStore((state) => state.openBet);
  const [selected, setSelected] = useState(0);
  const [stake, setStake] = useState(1);
  const [balance, setBalance] = useState<number | null>(null);
  const [odds, setOdds] = useState<OddsRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOdds() {
      try {
        const response = await fetch(`/api/odds/${fixtureId}`);
        const payload = await response.json();
        if (!cancelled) setOdds(payload.primary ?? null);
      } catch {
        if (!cancelled) setOdds(null);
      }
    }

    loadOdds();
    const interval = window.setInterval(loadOdds, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [fixtureId]);

  useEffect(() => {
    if (!wallet.publicKey) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    connection.getBalance(wallet.publicKey).then((lamports) => {
      if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
    });
    return () => {
      cancelled = true;
    };
  }, [connection, wallet.publicKey]);

  const multiplier = useMemo(() => {
    const price = odds?.Prices?.[selected];
    return price ? price / 1000 : 0;
  }, [odds, selected]);
  const fee = stake * 0.01;
  const payout = Math.max(0, stake * multiplier - fee);
  const availability = balance === null ? "Connect wallet" : `${balance.toFixed(2)} SOL`;

  return (
    <section className="win95-window">
      <div className="win95-titlebar">
        <span>BET_SLIP.EXE</span>
        <span className={marketExists ? "market-open px-1.5 py-0.5 text-[10px] font-black" : "market-closed px-1.5 py-0.5 text-[10px] font-black"}>
          {marketExists ? "SOL OPEN" : "PDA WAIT"}
        </span>
      </div>
      <div className="win95-window-body grid gap-3">
        <div>
          <div className="mb-1 text-xs font-black uppercase text-[var(--muted)]">Selected Outcome</div>
          <div className="grid grid-cols-3 gap-1">
            {labels.map((item, index) => (
              <button
                key={`${item}-${index}`}
                className={`win95-button min-w-0 px-1 text-xs ${selected === index ? "win95-button-primary" : ""}`}
                onClick={() => setSelected(index)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs font-black uppercase text-[var(--muted)]">
            <span>Stake Amount</span>
            <span>Available: {availability}</span>
          </div>
          <label className="win95-panel-inset flex min-h-12 items-center bg-white px-3">
            <input
              className="w-full bg-transparent text-lg font-black text-black outline-none"
              inputMode="decimal"
              min="0"
              value={String(stake)}
              onChange={(event) => setStake(Math.max(0, Number(event.target.value) || 0))}
            />
            <span className="text-sm font-black text-[var(--muted)]">SOL</span>
          </label>
          <div className="mt-2 text-center text-sm font-black text-[#000080]">
            {payout ? payout.toFixed(3) : "0.000"} SOL payout if right
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <button className="win95-button" onClick={() => setStake((value) => value + 1)} type="button">+1</button>
            <button className="win95-button" onClick={() => setStake((value) => value + 5)} type="button">+5</button>
            <button className="win95-button" onClick={() => balance !== null && setStake(Number(balance.toFixed(3)))} type="button">MAX</button>
          </div>
        </div>
        <div className="win95-panel-inset bg-[#efefdf] p-3 text-sm font-bold">
          <div className="flex justify-between py-1 text-[var(--muted)]"><span>Multiplier</span><span className="text-black">{multiplier ? `${multiplier.toFixed(2)}x` : "--"}</span></div>
          <div className="flex justify-between py-1 text-[var(--muted)]"><span>Market Probability</span><span className="text-black">{odds?.Pct?.[selected] ? `${Number(odds.Pct[selected]).toFixed(1)}%` : "--"}</span></div>
          <div className="flex justify-between py-1 text-[var(--muted)]"><span>Platform Fee (1%)</span><span className="text-black">{fee.toFixed(3)} SOL</span></div>
          <div className="mt-2 flex justify-between border-t-2 border-[#808080] pt-2 text-black"><span>Est. Payout</span><span className="text-xl font-black text-[#000080]">{payout ? payout.toFixed(3) : "--"} SOL</span></div>
        </div>
        <button
          className="win95-button win95-button-primary min-h-12 text-base"
          onClick={() => {
            const payload = {
              fixtureId,
              title,
              marketType: 0,
              outcomeIndex: selected,
              outcomeLabel: outcomeLabels[selected] ?? labels[selected] ?? `Outcome ${selected + 1}`,
              marketExists,
              oddsPrice: odds?.Prices?.[selected],
              oddsMessageId: odds?.MessageId,
              oddsTs: odds?.Ts
            };
            console.debug("MatchBetPanel.openBet", payload);
            openBet(payload);
          }}
          type="button"
        >
          Place Prediction
        </button>
        <div className="text-center text-[10px] font-black uppercase text-[var(--muted)]">
          {odds ? `Odds update ${odds.MessageId.slice(0, 16)}...` : "Waiting for TxLINE odds"}
        </div>
      </div>
    </section>
  );
}
