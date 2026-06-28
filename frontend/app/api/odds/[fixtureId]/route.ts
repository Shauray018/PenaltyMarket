import { NextRequest, NextResponse } from "next/server";
import { txlineError, txlineFetch, type TxLineOddsRecord } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fixtureId: string }> }) {
  try {
    const { fixtureId } = await params;
    const mode = request.nextUrl.searchParams.get("mode") ?? "snapshot";
    const asOf = request.nextUrl.searchParams.get("asOf");
    const path =
      mode === "updates"
        ? `/api/odds/updates/${fixtureId}`
        : `/api/odds/snapshot/${fixtureId}${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ""}`;
    const odds = await txlineFetch<TxLineOddsRecord[]>(path);

    return NextResponse.json({
      odds,
      primary: pickPrimaryOdds(odds)
    });
  } catch (error) {
    return txlineError(error);
  }
}

function pickPrimaryOdds(odds: TxLineOddsRecord[]) {
  const fullTimeMatchWinner = odds.find((record) => {
    const type = record.SuperOddsType.toLowerCase();
    const names = record.PriceNames.join(" ").toLowerCase();
    return (type.includes("1x2") || names.includes("draw")) && !record.MarketPeriod;
  });
  if (fullTimeMatchWinner) return fullTimeMatchWinner;

  const matchWinner = odds.find((record) => {
    const type = record.SuperOddsType.toLowerCase();
    const names = record.PriceNames.join(" ").toLowerCase();
    return type.includes("1x2") || names.includes("draw");
  });

  return matchWinner ?? odds[0] ?? null;
}
