import { PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { txoracleDevnetProgramId } from "@/lib/solana";
import { txlineError, txlineProofFetch } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const messageId = request.nextUrl.searchParams.get("messageId");
    const ts = request.nextUrl.searchParams.get("ts");

    if (!messageId || !ts) {
      return NextResponse.json({ error: "messageId and ts are required." }, { status: 400 });
    }

    const search = new URLSearchParams({ messageId, ts });
    const raw = await txlineProofFetch<Record<string, unknown>>(`/api/odds/validation?${search.toString()}`);
    const proof = normalizeOddsProof(raw);
    const dailyOddsMerkleRoots = deriveDailyBatchRootsPda(proof.ts);

    return NextResponse.json({
      odds: raw.odds ?? null,
      proof,
      dailyOddsMerkleRoots
    });
  } catch (error) {
    return txlineError(error);
  }
}

function deriveDailyBatchRootsPda(ts: number) {
  const epochDay = Math.floor(ts / 86_400_000);
  const dayBytes = Buffer.alloc(2);
  dayBytes.writeUInt16LE(epochDay);
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("daily_batch_roots"), dayBytes], txoracleDevnetProgramId);
  return pda.toBase58();
}

function normalizeOddsProof(raw: Record<string, unknown>) {
  return {
    ts: Number((raw.odds as { Ts?: number } | undefined)?.Ts ?? raw.ts ?? 0),
    oddsSnapshot: normalizeOddsSnapshot(raw.odds as Record<string, unknown> | undefined),
    summary: normalizeOddsSummary(raw.summary as Record<string, unknown> | undefined),
    subTreeProof: normalizeProofNodes(raw.subTreeProof),
    mainTreeProof: normalizeProofNodes(raw.mainTreeProof)
  };
}

function normalizeOddsSnapshot(odds?: Record<string, unknown>) {
  return {
    fixtureId: Number(odds?.FixtureId ?? odds?.fixtureId ?? 0),
    messageId: String(odds?.MessageId ?? odds?.messageId ?? ""),
    ts: Number(odds?.Ts ?? odds?.ts ?? 0),
    bookmaker: String(odds?.Bookmaker ?? odds?.bookmaker ?? ""),
    bookmakerId: Number(odds?.BookmakerId ?? odds?.bookmakerId ?? 0),
    superOddsType: String(odds?.SuperOddsType ?? odds?.superOddsType ?? ""),
    gameState: optionalString(odds?.GameState ?? odds?.gameState),
    inRunning: Boolean(odds?.InRunning ?? odds?.inRunning),
    marketParameters: optionalString(odds?.MarketParameters ?? odds?.marketParameters),
    marketPeriod: optionalString(odds?.MarketPeriod ?? odds?.marketPeriod),
    priceNames: toStringArray(odds?.PriceNames ?? odds?.priceNames),
    prices: toNumberArray(odds?.Prices ?? odds?.prices)
  };
}

function normalizeOddsSummary(summary?: Record<string, unknown>) {
  const updateStats = (summary?.updateStats ?? summary?.UpdateStats ?? {}) as Record<string, unknown>;
  return {
    fixtureId: Number(summary?.fixtureId ?? summary?.FixtureId ?? 0),
    updateStats: {
      updateCount: Number(updateStats.updateCount ?? updateStats.UpdateCount ?? 0),
      minTimestamp: Number(updateStats.minTimestamp ?? updateStats.MinTimestamp ?? 0),
      maxTimestamp: Number(updateStats.maxTimestamp ?? updateStats.MaxTimestamp ?? 0)
    },
    oddsSubTreeRoot: toNumberArray(summary?.oddsSubTreeRoot ?? summary?.OddsSubTreeRoot)
  };
}

function normalizeProofNodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((node) => {
    const item = (node ?? {}) as Record<string, unknown>;
    return {
      hash: toNumberArray(item.hash ?? item.Hash),
      isRightSibling: Boolean(item.isRightSibling ?? item.IsRightSibling)
    };
  });
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function toNumberArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => Number(item)) : [];
}

function optionalString(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(value);
}
