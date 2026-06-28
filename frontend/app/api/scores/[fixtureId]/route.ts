import { NextRequest, NextResponse } from "next/server";
import { summarizeScore, txlineError, txlineFetch, type TxLineScoreSnapshot } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fixtureId: string }> }) {
  try {
    const { fixtureId } = await params;
    const asOf = request.nextUrl.searchParams.get("asOf");
    const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
    const snapshots = await txlineFetch<TxLineScoreSnapshot[]>(`/api/scores/snapshot/${fixtureId}${query}`);

    return NextResponse.json({
      snapshots,
      summary: summarizeScore(snapshots)
    });
  } catch (error) {
    return txlineError(error);
  }
}
