import { NextRequest, NextResponse } from "next/server";
import { txlineError, txlineFetch, type TxLineOddsRecord } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fixtureId: string }> }) {
  try {
    const { fixtureId } = await params;
    const mode = request.nextUrl.searchParams.get("mode") ?? "updates";
    const marketType = Number(request.nextUrl.searchParams.get("marketType") ?? "0");
    const asOf = request.nextUrl.searchParams.get("asOf");
    const odds =
      mode === "bettable"
        ? await fetchBettableOdds(fixtureId, marketType)
        : await txlineFetch<TxLineOddsRecord[]>(
            mode === "updates"
              ? `/api/odds/updates/${fixtureId}`
              : `/api/odds/snapshot/${fixtureId}${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ""}`
          );
    const primary = pickPrimaryOdds(odds, marketType);

    console.log(
      JSON.stringify({
        tag: "txline-primary-odds",
        fixtureId,
        mode,
        marketType,
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
          .filter((record) => isMarketOdds(record, marketType))
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

function pickPrimaryOdds(odds: TxLineOddsRecord[], marketType: number) {
  return odds.find((record) => isPreferredMarketOdds(record, marketType)) ?? odds.find((record) => isMarketOdds(record, marketType)) ?? null;
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

function isMarketOdds(record: TxLineOddsRecord, marketType: number) {
  if (marketType === 0) return isExactFullTimeThreeWay(record);

  const type = record.SuperOddsType.toUpperCase();
  const priceNames = record.PriceNames.map((name) => name.toLowerCase());
  const isOverUnder = priceNames.length === 2 && priceNames[0] === "over" && priceNames[1] === "under";
  if (!isOverUnder || record.MarketPeriod) return false;

  if (marketType === 1) return type.includes("OVERUNDER") && type.includes("GOALS");
  if (marketType === 2) return type.includes("OVERUNDER") && type.includes("CORNERS");
  if (marketType === 3) return type.includes("OVERUNDER") && (type.includes("CARD") || type.includes("YELLOW"));

  return false;
}

function isPreferredMarketOdds(record: TxLineOddsRecord, marketType: number) {
  if (!isMarketOdds(record, marketType)) return false;
  const line = record.MarketParameters?.match(/line=([^,]+)/)?.[1];
  if (marketType === 1) return line === "2.5";
  if (marketType === 2) return line === "8.5";
  if (marketType === 3) return line === "3.5";
  return true;
}

async function fetchBettableOdds(fixtureId: string, marketType: number) {
  const live = await txlineFetch<TxLineOddsRecord[]>(`/api/odds/updates/${fixtureId}`);
  const anchorTs = Math.max(...live.map((record) => Number(record.Ts ?? 0)).filter(Boolean), Date.now());

  for (let step = 1; step <= 6; step += 1) {
    const candidateTs = anchorTs - step * 5 * 60 * 1000;
    const endpoint = historicalOddsPath(fixtureId, candidateTs);
    const historical = await txlineFetch<TxLineOddsRecord[]>(endpoint);
    const candidate = pickPrimaryOdds(historical, marketType);

    console.log(
      JSON.stringify({
        tag: "txline-bettable-odds-candidate",
        fixtureId,
        marketType,
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
