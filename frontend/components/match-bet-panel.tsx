"use client";

import { useEffect, useMemo, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

type OddsRecord = {
  PriceNames: string[];
  Prices: number[];
  Pct: string[];
  MessageId: string;
  Ts: number;
};

export function MatchBetPanel({
  fixtureId,
  labels
}: {
  fixtureId: string;
  labels: string[];
}) {
  const wallet = useWallet();
  const { connection } = useConnection();
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
    <section className="rounded-[20px] border border-[#166b36] bg-[#030604] p-7">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Place Prediction</h2>
        <span className="rounded-full bg-[#082b16] px-3 py-1 text-xs font-black text-[var(--accent)]">SOL Only</span>
      </div>
      <div className="grid gap-5">
        <div>
          <div className="mb-3 text-xs font-black uppercase tracking-wider text-white/45">Selected Outcome</div>
          <div className="grid grid-cols-3 rounded-[16px] bg-[#101316] p-1">
            {labels.map((item, index) => (
              <button
                key={`${item}-${index}`}
                className={`h-10 rounded-[13px] text-sm font-black ${selected === index ? "bg-black text-[var(--accent)]" : "text-white/45"}`}
                onClick={() => setSelected(index)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 flex justify-between text-xs font-black uppercase tracking-wider text-white/45">
            <span>Stake Amount</span>
            <span>Available: {availability}</span>
          </div>
          <label className="flex h-14 items-center rounded-[14px] border border-[#1f282b] bg-black px-4">
            <input
              className="w-full bg-transparent text-lg font-black text-white outline-none"
              inputMode="decimal"
              min="0"
              value={String(stake)}
              onChange={(event) => setStake(Math.max(0, Number(event.target.value) || 0))}
            />
            <span className="text-sm font-black text-white/55">SOL</span>
          </label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <button className="dark-press-3d h-10 rounded-full text-sm font-black text-white" onClick={() => setStake((value) => value + 1)} type="button">+1</button>
            <button className="dark-press-3d h-10 rounded-full text-sm font-black text-white" onClick={() => setStake((value) => value + 5)} type="button">+5</button>
            <button className="dark-press-3d h-10 rounded-full text-sm font-black text-white" onClick={() => balance !== null && setStake(Number(balance.toFixed(3)))} type="button">MAX</button>
          </div>
        </div>
        <div className="rounded-[14px] bg-[#090d0c] p-4 text-sm font-bold">
          <div className="flex justify-between py-2 text-white/55"><span>Multiplier</span><span className="text-white">{multiplier ? `${multiplier.toFixed(2)}x` : "--"}</span></div>
          <div className="flex justify-between py-2 text-white/55"><span>Market Probability</span><span className="text-white">{odds?.Pct?.[selected] ? `${Number(odds.Pct[selected]).toFixed(1)}%` : "--"}</span></div>
          <div className="flex justify-between py-2 text-white/55"><span>Platform Fee (1%)</span><span className="text-white">{fee.toFixed(3)} SOL</span></div>
          <div className="flex justify-between border-t border-[#1f282b] pt-4 text-white"><span>Est. Payout</span><span className="text-2xl font-black text-[var(--accent)]">{payout ? payout.toFixed(3) : "--"} SOL</span></div>
        </div>
        <button className="press-3d h-14 rounded-[16px] bg-[var(--accent)] text-lg font-black text-[#071008]" type="button">
          Place Prediction
        </button>
        <div className="text-center text-xs font-black uppercase tracking-wider text-white/40">
          {odds ? `Odds update ${odds.MessageId.slice(0, 16)}...` : "Waiting for TxLINE odds"}
        </div>
      </div>
    </section>
  );
}
