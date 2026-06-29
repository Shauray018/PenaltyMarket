"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type ScoreResponse = {
  summary?: {
    latest?: { GameState?: string; Action?: string; Clock?: { Seconds?: number; Running?: boolean } };
    status?: { name: string; label: string; phase: string; live: boolean; terminal: boolean } | null;
    statusId?: number | null;
    isLive?: boolean;
    action?: string | null;
    participant1?: { goals: number; yellowCards: number; redCards: number; corners: number };
    participant2?: { goals: number; yellowCards: number; redCards: number; corners: number };
    unreliable?: { corners: boolean; cards: boolean };
  };
};

type ScoreEvent = {
  FixtureId?: number;
  Action?: string;
  Ts?: number;
  StatusId?: number;
  Clock?: { Running?: boolean; Seconds?: number };
  Score?: {
    Participant1?: { Total?: { Goals?: number; YellowCards?: number; RedCards?: number; Corners?: number } };
    Participant2?: { Total?: { Goals?: number; YellowCards?: number; RedCards?: number; Corners?: number } };
  };
};

const STATUS_LABELS: Record<number, { name: string; label: string; live: boolean; terminal: boolean }> = {
  1: { name: "NS", label: "Not Started", live: false, terminal: false },
  2: { name: "H1", label: "1st Half", live: true, terminal: false },
  3: { name: "HT", label: "Half Time", live: false, terminal: false },
  4: { name: "H2", label: "2nd Half", live: true, terminal: false },
  5: { name: "F", label: "Finished", live: false, terminal: true },
  7: { name: "ET1", label: "Extra Time 1", live: true, terminal: false },
  9: { name: "ET2", label: "Extra Time 2", live: true, terminal: false },
  12: { name: "PE", label: "Penalties", live: true, terminal: false },
  13: { name: "FPE", label: "Finished After Penalties", live: false, terminal: true }
};

function mergeEvent(summary: ScoreResponse["summary"], event: ScoreEvent): ScoreResponse["summary"] {
  const status = event.StatusId ? STATUS_LABELS[event.StatusId] : summary?.status;
  const score = event.Score;

  return {
    ...summary,
    latest: event,
    statusId: event.StatusId ?? summary?.statusId ?? null,
    status: status ? { ...status, phase: status.live ? "live" : status.terminal ? "finished" : "break" } : summary?.status ?? null,
    isLive: status?.live ?? summary?.isLive ?? false,
    action: event.Action ?? summary?.action ?? null,
    participant1: {
      goals: score?.Participant1?.Total?.Goals ?? summary?.participant1?.goals ?? 0,
      yellowCards: score?.Participant1?.Total?.YellowCards ?? summary?.participant1?.yellowCards ?? 0,
      redCards: score?.Participant1?.Total?.RedCards ?? summary?.participant1?.redCards ?? 0,
      corners: score?.Participant1?.Total?.Corners ?? summary?.participant1?.corners ?? 0
    },
    participant2: {
      goals: score?.Participant2?.Total?.Goals ?? summary?.participant2?.goals ?? 0,
      yellowCards: score?.Participant2?.Total?.YellowCards ?? summary?.participant2?.yellowCards ?? 0,
      redCards: score?.Participant2?.Total?.RedCards ?? summary?.participant2?.redCards ?? 0,
      corners: score?.Participant2?.Total?.Corners ?? summary?.participant2?.corners ?? 0
    }
  };
}

function readScoreEvent(value: unknown): ScoreEvent | null {
  if (!value || typeof value !== "object") return null;
  const maybeWrapped = value as { Update?: ScoreEvent };
  return maybeWrapped.Update ?? (value as ScoreEvent);
}

export function LiveScore({
  fixtureId,
  compact = false,
  stream = false,
  initialSummary
}: {
  fixtureId: string | number;
  compact?: boolean;
  stream?: boolean;
  initialSummary?: ScoreResponse["summary"];
}) {
  const [streamedSummary, setStreamedSummary] = useState<ScoreResponse["summary"]>(initialSummary);
  const { data, isLoading } = useQuery<ScoreResponse>({
    queryKey: ["score", fixtureId],
    queryFn: async () => {
      const response = await fetch(`/api/scores/${fixtureId}`);
      if (!response.ok) throw new Error("Unable to load score.");
      return response.json();
    },
    initialData: initialSummary ? { summary: initialSummary } : undefined,
    enabled: stream,
    refetchInterval: stream ? 10_000 : false,
    retry: false
  });

  useEffect(() => {
    if (!stream) return;

    const eventSource = new EventSource(`/api/scores/stream?fixtureId=${fixtureId}`);
    eventSource.onmessage = (message) => {
      try {
        const event = readScoreEvent(JSON.parse(message.data));
        if (!event) return;
        if (String(event.FixtureId) !== String(fixtureId)) return;
        setStreamedSummary((current) => mergeEvent(current ?? data?.summary ?? initialSummary, event));
      } catch {
        // Ignore heartbeat or non-JSON SSE frames.
      }
    };

    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [data?.summary, fixtureId, initialSummary, stream]);

  const score = streamedSummary ?? data?.summary ?? initialSummary;

  if (stream && isLoading) return <span className="text-sm text-[var(--muted)]">Loading score</span>;
  if (!score) return <span className="text-sm text-[var(--muted)]">Score unavailable</span>;

  return (
    <div className={compact ? "text-sm" : "grid gap-3"}>
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {score.participant1?.goals ?? 0} - {score.participant2?.goals ?? 0}
        </span>
        <span className="text-[var(--muted)]">{score.status?.label ?? score.latest?.GameState ?? "No status"}</span>
      </div>
      {!compact && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-[var(--border)] p-3">
            <div className="text-[var(--muted)]">Team 1</div>
            <div>Corners {score.participant1?.corners ?? 0}</div>
            <div>Yellow cards {score.participant1?.yellowCards ?? 0}</div>
            <div>Red cards {score.participant1?.redCards ?? 0}</div>
          </div>
          <div className="rounded-md border border-[var(--border)] p-3">
            <div className="text-[var(--muted)]">Team 2</div>
            <div>Corners {score.participant2?.corners ?? 0}</div>
            <div>Yellow cards {score.participant2?.yellowCards ?? 0}</div>
            <div>Red cards {score.participant2?.redCards ?? 0}</div>
          </div>
          {score.action && <div className="col-span-2 text-[var(--muted)]">Last event: {score.action}</div>}
        </div>
      )}
    </div>
  );
}
