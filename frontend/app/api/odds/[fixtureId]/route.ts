import { NextRequest, NextResponse } from "next/server";
import { txlineError, txlineFetch, type TxLineOddsRecord } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fixtureId: string }> }) {
  try {
    const { fixtureId } = await params;
    const mode = request.nextUrl.searchParams.get("mode") ?? "updates";
    const asOf = request.nextUrl.searchParams.get("asOf");
    const odds =
      mode === "bettable"
        ? await fetchBettableOdds(fixtureId)
        : await txlineFetch<TxLineOddsRecord[]>(
            mode === "updates"
              ? `/api/odds/updates/${fixtureId}`
              : `/api/odds/snapshot/${fixtureId}${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ""}`
          );
    const primary = pickPrimaryOdds(odds);

    console.log(
      JSON.stringify({
        tag: "txline-primary-odds",
        fixtureId,
        mode,
        count: odds.length,
        primary: primary
          ? {
              MessageId: primary.MessageId,
              Ts: primary.Ts,
              SuperOddsType: primary.SuperOddsType,
              MarketPeriod: primary.MarketPeriod ?? null,
              PriceNames: primary.PriceNames,
              Prices: primary.Prices,
              Pct: primary.Pct
            }
          : null
      })
    );

    return NextResponse.json({
      odds,
      primary,
      debug: {
        candidates: odds
          .filter(isExactFullTimeThreeWay)
          .map((record) => ({
            MessageId: record.MessageId,
            Ts: record.Ts,
            SuperOddsType: record.SuperOddsType,
            MarketPeriod: record.MarketPeriod ?? null,
            PriceNames: record.PriceNames,
            Prices: record.Prices,
            Pct: record.Pct
          }))
      }
    });
  } catch (error) {
    return txlineError(error);
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

async function fetchBettableOdds(fixtureId: string) {
  const live = await txlineFetch<TxLineOddsRecord[]>(`/api/odds/updates/${fixtureId}`);
  const anchorTs = Math.max(...live.map((record) => Number(record.Ts ?? 0)).filter(Boolean), Date.now());

  for (let step = 1; step <= 6; step += 1) {
    const candidateTs = anchorTs - step * 5 * 60 * 1000;
    const endpoint = historicalOddsPath(fixtureId, candidateTs);
    const historical = await txlineFetch<TxLineOddsRecord[]>(endpoint);
    const candidate = pickPrimaryOdds(historical);

    console.log(
      JSON.stringify({
        tag: "txline-bettable-odds-candidate",
        fixtureId,
        step,
        endpoint,
        count: historical.length,
        picked: candidate
          ? {
              MessageId: candidate.MessageId,
              Ts: candidate.Ts,
              SuperOddsType: candidate.SuperOddsType,
              MarketPeriod: candidate.MarketPeriod ?? null,
              PriceNames: candidate.PriceNames,
              Prices: candidate.Prices
            }
          : null
      })
    );

    if (candidate) {
      return historical;
    }
  }

  return [];
}

function historicalOddsPath(fixtureId: string, ts: number) {
  const date = new Date(ts);
  const epochDay = Math.floor(ts / 86_400_000);
  const hourOfDay = date.getUTCHours();
  const interval = Math.floor(date.getUTCMinutes() / 5);
  return `/api/odds/updates/${epochDay}/${hourOfDay}/${interval}?fixtureId=${encodeURIComponent(fixtureId)}`;
}
