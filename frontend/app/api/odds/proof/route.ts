import { NextRequest, NextResponse } from "next/server";
import { txlineError, txlineFetch } from "@/lib/txline";

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
    const proof = await txlineFetch(`/api/odds/validation?${search.toString()}`);
    return NextResponse.json({ proof });
  } catch (error) {
    return txlineError(error);
  }
}
