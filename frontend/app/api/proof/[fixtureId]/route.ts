import { NextRequest, NextResponse } from "next/server";
import { txlineError, txlineFetch } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fixtureId: string }> }) {
  try {
    const { fixtureId } = await params;
    const statistic = request.nextUrl.searchParams.get("statistic");
    const asOf = request.nextUrl.searchParams.get("asOf");
    const search = new URLSearchParams({ fixtureId });
    if (statistic) search.set("statistic", statistic);
    if (asOf) search.set("asOf", asOf);

    const proof = await txlineFetch(`/api/fixtures/validation?${search.toString()}`);
    return NextResponse.json({ proof });
  } catch (error) {
    return txlineError(error);
  }
}
