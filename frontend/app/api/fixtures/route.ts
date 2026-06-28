import { NextResponse } from "next/server";
import { marketTiming } from "@/lib/market-policy";
import { normalizeFixture, statusInfo, summarizeScore, txlineError, txlineFetch, type TxLineFixture, type TxLineScoreSnapshot } from "@/lib/txline";

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

    return NextResponse.json({ fixtures: visible });
  } catch (error) {
    return txlineError(error);
  }
}
