import { NextResponse } from "next/server";
import { TXLINE_BASE_URL } from "@/lib/constants";

export type TxLineFixture = {
  fixtureId?: number;
  FixtureId?: number;
  participant1?: string;
  participant2?: string;
  Participant1?: string;
  Participant2?: string;
  participant1Name?: string;
  participant2Name?: string;
  startTime?: number;
  StartTime?: number;
  gameState?: string;
  GameState?: string;
  sportId?: number;
  competitionId?: number;
};

export type TxLineScoreSnapshot = {
  FixtureId?: number;
  GameState?: string;
  StartTime?: number;
  Participant1?: string;
  Participant2?: string;
  Participant1Id?: number;
  Participant2Id?: number;
  Action?: string;
  Id?: number;
  Ts?: number;
  Seq?: number;
  StatusId?: number;
  Type?: "Soccer" | string;
  Clock?: { Running?: boolean; Seconds?: number };
  Score?: {
    Participant1?: { Total?: ScoreTotals };
    Participant2?: { Total?: ScoreTotals };
  };
  Data?: Record<string, unknown>;
  Stats?: Record<string, number>;
  Participant?: number;
  Possession?: number;
  PossessionType?: string;
  UnreliableCorners?: boolean;
  UnreliableCards?: boolean;
};

export type TxLineOddsRecord = {
  FixtureId: number;
  MessageId: string;
  Ts: number;
  Bookmaker: string;
  BookmakerId: number;
  SuperOddsType: string;
  InRunning: boolean;
  GameState?: string;
  MarketParameters?: string;
  MarketPeriod?: string;
  PriceNames: string[];
  Prices: number[];
  Pct: string[];
};

type ScoreTotals = {
  Goals?: number;
  YellowCards?: number;
  RedCards?: number;
  Corners?: number;
};

export const STATUS = {
  1: { name: "NS", label: "Not Started", phase: "scheduled", live: false, terminal: false },
  2: { name: "H1", label: "1st Half", phase: "live", live: true, terminal: false },
  3: { name: "HT", label: "Half Time", phase: "break", live: false, terminal: false },
  4: { name: "H2", label: "2nd Half", phase: "live", live: true, terminal: false },
  5: { name: "F", label: "Finished", phase: "finished", live: false, terminal: true },
  6: { name: "WET", label: "Waiting for Extra Time", phase: "break", live: false, terminal: false },
  7: { name: "ET1", label: "1st Half Extra Time", phase: "live", live: true, terminal: false },
  8: { name: "HTET", label: "Half Time Extra Time", phase: "break", live: false, terminal: false },
  9: { name: "ET2", label: "2nd Half Extra Time", phase: "live", live: true, terminal: false },
  10: { name: "FET", label: "Finished After Extra Time", phase: "finished", live: false, terminal: true },
  11: { name: "WPE", label: "Waiting for Penalties", phase: "break", live: false, terminal: false },
  12: { name: "PE", label: "Penalty Shootout", phase: "live", live: true, terminal: false },
  13: { name: "FPE", label: "Finished After Penalties", phase: "finished", live: false, terminal: true },
  14: { name: "I", label: "Interrupted", phase: "interrupted", live: false, terminal: false },
  15: { name: "A", label: "Abandoned", phase: "abandoned", live: false, terminal: true },
  16: { name: "C", label: "Cancelled", phase: "cancelled", live: false, terminal: true },
  17: { name: "TXCC", label: "TX Coverage Cancelled", phase: "cancelled", live: false, terminal: true },
  18: { name: "TXCS", label: "TX Coverage Suspended", phase: "suspended", live: false, terminal: false }
} as const;

export function statusInfo(statusId?: number) {
  return statusId ? STATUS[statusId as keyof typeof STATUS] ?? null : null;
}

function txlineHeaders() {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;

  if (!jwt || !apiToken) {
    throw new Error("Missing TXLINE_JWT or TXLINE_API_TOKEN.");
  }

  return {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken
  };
}

export function getTxlineHeaders() {
  return txlineHeaders();
}

export async function txlineFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TXLINE_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...txlineHeaders(),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`TxLINE ${response.status}: ${detail || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function txlineError(error: unknown) {
  const message = error instanceof Error ? error.message : "TxLINE request failed.";
  const status = message.includes("Missing TXLINE") ? 500 : 502;
  return NextResponse.json({ error: message }, { status });
}

export function normalizeFixture(fixture: TxLineFixture) {
  const fixtureId = fixture.fixtureId ?? fixture.FixtureId;
  const participant1 = fixture.participant1 ?? fixture.Participant1 ?? fixture.participant1Name ?? "Team 1";
  const participant2 = fixture.participant2 ?? fixture.Participant2 ?? fixture.participant2Name ?? "Team 2";
  const startTime = fixture.startTime ?? fixture.StartTime;
  const gameState = fixture.gameState ?? fixture.GameState ?? "unknown";

  return { ...fixture, fixtureId, participant1, participant2, startTime, gameState };
}

export function summarizeScore(snapshots: TxLineScoreSnapshot[]) {
  const sorted = [...snapshots].sort((a, b) => (a.Ts ?? 0) - (b.Ts ?? 0));
  const latest = sorted.at(-1);
  const latestScore = [...sorted].reverse().find((snapshot) => snapshot.Score)?.Score;
  const latestStatus = [...sorted].reverse().find((snapshot) => snapshot.StatusId)?.StatusId;
  const status = statusInfo(latestStatus);
  const unreliableCorners = [...sorted].reverse().find((snapshot) => typeof snapshot.UnreliableCorners === "boolean")?.UnreliableCorners;
  const unreliableCards = [...sorted].reverse().find((snapshot) => typeof snapshot.UnreliableCards === "boolean")?.UnreliableCards;

  return {
    latest,
    statusId: latestStatus ?? null,
    status,
    clock: latest?.Clock ?? null,
    action: latest?.Action ?? null,
    isLive: Boolean(status?.live),
    isFinished: Boolean(status?.terminal),
    unreliable: {
      corners: Boolean(unreliableCorners),
      cards: Boolean(unreliableCards)
    },
    participant1: {
      goals: latestScore?.Participant1?.Total?.Goals ?? 0,
      yellowCards: latestScore?.Participant1?.Total?.YellowCards ?? 0,
      redCards: latestScore?.Participant1?.Total?.RedCards ?? 0,
      corners: latestScore?.Participant1?.Total?.Corners ?? 0
    },
    participant2: {
      goals: latestScore?.Participant2?.Total?.Goals ?? 0,
      yellowCards: latestScore?.Participant2?.Total?.YellowCards ?? 0,
      redCards: latestScore?.Participant2?.Total?.RedCards ?? 0,
      corners: latestScore?.Participant2?.Total?.Corners ?? 0
    }
  };
}
