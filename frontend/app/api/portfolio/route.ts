import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { connection, fetchMarketAccount, program, programId, serializeAccount } from "@/lib/solana";
import { summarizeScore, txlineFetch, type TxLineScoreSnapshot } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BET_POSITION_ACCOUNT_SIZE = 211;

export async function GET(request: NextRequest) {
  try {
    const userParam = request.nextUrl.searchParams.get("user");
    if (!userParam) return NextResponse.json({ positions: [] });

    const user = new PublicKey(userParam);
    const positionAccounts = await connection.getProgramAccounts(programId, {
      filters: [{ dataSize: BET_POSITION_ACCOUNT_SIZE }, { memcmp: { offset: 40, bytes: user.toBase58() } }]
    });
    const settlementCache = new Map<number, Promise<PortfolioSettlement | null>>();

    const positions = (
      await Promise.all(
        positionAccounts.map(async ({ pubkey, account }) => {
          try {
            const position = program.coder.accounts.decode("betPosition", account.data);
            const marketKey = position.market as PublicKey;
            const market = await fetchMarketAccount(marketKey).catch(() => null);
            const serializedMarket = market ? (serializeAccount(market) as Record<string, unknown>) : null;
            const fixtureId = numberFromAccountValue(serializedMarket?.fixtureId);
            const settlement = fixtureId ? await loadSettlement(fixtureId, settlementCache) : null;

            return {
              publicKey: pubkey.toBase58(),
              position: serializeAccount(position),
              marketPublicKey: marketKey.toBase58(),
              market: serializedMarket,
              settlement
            };
          } catch {
            return null;
          }
        })
      )
    ).filter((position) => position !== null);

    return NextResponse.json({ positions, skipped: positionAccounts.length - positions.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read portfolio." }, { status: 400 });
  }
}

type PortfolioSettlement = {
  isFinished: boolean;
  status: { name: string; label: string; phase: string; live: boolean; terminal: boolean } | null;
  score: { participant1: number; participant2: number };
  derivedWinningOutcome: number | null;
};

function loadSettlement(fixtureId: number, cache: Map<number, Promise<PortfolioSettlement | null>>) {
  const cached = cache.get(fixtureId);
  if (cached) return cached;

  const request = loadSettlementUncached(fixtureId);
  cache.set(fixtureId, request);
  return request;
}

async function loadSettlementUncached(fixtureId: number): Promise<PortfolioSettlement | null> {
  try {
    const snapshots = await txlineFetch<TxLineScoreSnapshot[]>(`/api/scores/snapshot/${fixtureId}`);
    const summary = summarizeScore(snapshots);
    const participant1 = summary.participant1.goals;
    const participant2 = summary.participant2.goals;
    const derivedWinningOutcome = summary.isFinished ? (participant1 > participant2 ? 0 : participant2 > participant1 ? 2 : 1) : null;

    return {
      isFinished: summary.isFinished,
      status: summary.status,
      score: { participant1, participant2 },
      derivedWinningOutcome
    };
  } catch {
    return null;
  }
}

function numberFromAccountValue(value: unknown) {
  const numeric = Number(typeof value === "object" && value && "toString" in value ? value.toString() : value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}
