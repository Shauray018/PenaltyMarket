import { NextRequest } from "next/server";
import { TXLINE_BASE_URL } from "@/lib/constants";
import { getTxlineHeaders } from "@/lib/txline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const fixtureId = request.nextUrl.searchParams.get("fixtureId");
  const ts = request.nextUrl.searchParams.get("Ts") ?? request.nextUrl.searchParams.get("ts");
  const upstreamUrl = new URL("/api/odds/stream", TXLINE_BASE_URL);

  if (fixtureId) upstreamUrl.searchParams.set("FixtureId", fixtureId);
  if (ts) upstreamUrl.searchParams.set("Ts", ts);

  const upstream = await fetch(upstreamUrl, {
    headers: getTxlineHeaders(),
    cache: "no-store"
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text();
    return new Response(detail || upstream.statusText, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
