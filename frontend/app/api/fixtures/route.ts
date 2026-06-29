import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { MARKET_TYPES } from "@/lib/constants";
import { marketTiming } from "@/lib/market-policy";
import { connection, fetchMarketAccount, marketPda, program, programId, serializeAccount } from "@/lib/solana";
import {
  normalizeFixture,
  statusInfo,
  summarizeScore,
  txlineError,
  txlineFetch,
  type TxLineFixture,
  type TxLineOddsRecord,
  type TxLineScoreSnapshot
} from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fixtures = await txlineFetch<TxLineFixture[]>("/api/fixtures/snapshot");
    const now = Date.now();
    const normalized = fixtures
      .map(normalizeFixture)
      .filter((fixture) => fixture.fixtureId && fixture.startTime)
      .filter((fixture) => Number(fixture.startTime) >= now - 12 * 60 * 60 * 1000)
      .sort((a, b) => Number(a.startTime ?? 0) - Number(b.startTime ?? 0))
      .slice(0, 80);

    const withScores = await Promise.all(
      normalized.map(async (fixture) => {
        try {
          const snapshots = await txlineFetch<TxLineScoreSnapshot[]>(`/api/scores/snapshot/${fixture.fixtureId}`);
          const summary = summarizeScore(snapshots);
          const status = summary.statusId ? statusInfo(summary.statusId) : null;

          return {
            ...fixture,
            timing: marketTiming(fixture.startTime, now),
            statusId: summary.statusId,
            status,
            phase: status?.phase ?? (Number(fixture.startTime) > now ? "scheduled" : "unknown"),
            isLive: summary.isLive,
            isFinished: summary.isFinished,
            score: summary
          };
        } catch {
          return {
            ...fixture,
            timing: marketTiming(fixture.startTime, now),
            statusId: null,
            status: null,
            phase: Number(fixture.startTime) > now ? "scheduled" : "unknown",
            isLive: false,
            isFinished: false,
            score: null
          };
        }
      })
    );

    const visible = withScores
      .filter((fixture) => fixture.phase === "scheduled" || fixture.isLive || (!fixture.isFinished && Number(fixture.startTime) >= now - 3 * 60 * 60 * 1000))
      .sort((a, b) => {
        const aActive = a.isLive || a.phase === "break";
        const bActive = b.isLive || b.phase === "break";
        if (aActive !== bActive) return aActive ? -1 : 1;
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        if (a.timing.bettingProminent !== b.timing.bettingProminent) return a.timing.bettingProminent ? -1 : 1;
        if (a.timing.initializeEligible !== b.timing.initializeEligible) return a.timing.initializeEligible ? -1 : 1;
        return Number(a.startTime ?? 0) - Number(b.startTime ?? 0);
      });

    const enriched = await Promise.all(
      visible.map(async (fixture) => {
        const fixtureId = Number(fixture.fixtureId);
        const [primaryOdds, matchWinnerMarket] = await Promise.all([
          loadPrimaryOdds(fixtureId),
          loadMatchWinnerMarket(fixtureId)
        ]);

        return {
          ...fixture,
          primaryOdds,
          matchWinnerMarket
        };
      })
    );

    return NextResponse.json({ fixtures: enriched });
  } catch (error) {
    return txlineError(error);
  }
}

async function loadPrimaryOdds(fixtureId: number) {
  try {
    const odds = await txlineFetch<TxLineOddsRecord[]>(`/api/odds/updates/${fixtureId}`);
    return pickPrimaryOdds(odds);
  } catch {
    return null;
  }
}

async function loadMatchWinnerMarket(fixtureId: number) {
  const matchWinnerType = MARKET_TYPES.find((marketType) => marketType.index === 0);
  if (!matchWinnerType) return null;

  const [publicKey] = marketPda(BigInt(fixtureId), matchWinnerType.index);

  try {
    const account = await fetchMarketAccount(publicKey);
    if (!account) {
      return {
        publicKey: publicKey.toBase58(),
        marketType: matchWinnerType,
        exists: false,
        account: null
      };
    }

    const { traderCount, positionCount } = await loadTraderCounts(publicKey);

    return {
      publicKey: publicKey.toBase58(),
      marketType: matchWinnerType,
      exists: true,
      account: {
        ...(serializeAccount(account) as Record<string, unknown>),
        traderCount,
        positionCount
      }
    };
  } catch (error) {
    return {
      publicKey: publicKey.toBase58(),
      marketType: matchWinnerType,
      exists: false,
      account: null,
      error: error instanceof Error ? error.message : "Unable to read market."
    };
  }
}

async function loadTraderCounts(market: PublicKey) {
  try {
    const positionAccounts = await connection.getProgramAccounts(programId, {
      filters: [{ memcmp: { offset: 8, bytes: market.toBase58() } }]
    });

    const traders = new Set<string>();
    for (const { account: raw } of positionAccounts) {
      try {
        const position = program.coder.accounts.decode("betPosition", raw.data) as { user: PublicKey };
        traders.add(position.user.toBase58());
      } catch {
        // Keep the market visible even if one historical position account cannot decode.
      }
    }

    return { traderCount: traders.size, positionCount: positionAccounts.length };
  } catch {
    return { traderCount: 0, positionCount: 0 };
  }
}

function pickPrimaryOdds(odds: TxLineOddsRecord[]) {
  return odds.find(isExactFullTimeThreeWay) ?? null;
}

function isExactFullTimeThreeWay(record: TxLineOddsRecord) {
  const type = record.SuperOddsType.toUpperCase();
  const priceNames = record.PriceNames.map((name) => name.toLowerCase());
  return (
    type === "1X2_PARTICIPANT_RESULT" &&
    !record.MarketPeriod &&
    priceNames.length === 3 &&
    priceNames[0] === "part1" &&
    priceNames[1] === "draw" &&
    priceNames[2] === "part2"
  );
}
