"use client";

import { useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui";

export function ClaimButton({ market, position }: { market: string; position: string }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<string | null>(null);

  async function claim() {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("Connect Phantom first.");
      return;
    }

    try {
      setStatus("Building claim");
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: wallet.publicKey.toBase58(), market, position })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to build claim.");

      const tx = Transaction.from(Buffer.from(payload.transaction, "base64"));
      const signed = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      setStatus(signature);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Claim failed.");
    }
  }

  return (
    <div className="grid gap-2">
      <Button className="win95-button-primary" onClick={claim}>Claim</Button>
      {status && <p className="win95-panel-inset break-all bg-white p-2 text-xs font-bold text-[var(--muted)]">{status}</p>}
    </div>
  );
}
