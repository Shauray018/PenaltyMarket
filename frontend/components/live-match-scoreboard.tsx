"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ScoreSummary = {
  latest?: {
    FixtureId?: number;
    GameState?: string;
    Action?: string;
    Clock?: { Seconds?: number; Running?: boolean };
  };
  status?: { name: string; label: string; phase: string; live: boolean; terminal: boolean } | null;
  statusId?: number | null;
  isLive?: boolean;
  participant1?: { goals: number; yellowCards?: number; redCards?: number; corners?: number };
  participant2?: { goals: number; yellowCards?: number; redCards?: number; corners?: number };
};

type ScoreResponse = {
  summary?: ScoreSummary;
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
  6: { name: "WET", label: "Waiting ET", live: false, terminal: false },
  7: { name: "ET1", label: "Extra Time 1", live: true, terminal: false },
  8: { name: "HTET", label: "ET Half Time", live: false, terminal: false },
  9: { name: "ET2", label: "Extra Time 2", live: true, terminal: false },
  10: { name: "FET", label: "Finished ET", live: false, terminal: true },
  11: { name: "WPE", label: "Waiting Pens", live: false, terminal: false },
  12: { name: "PE", label: "Penalties", live: true, terminal: false },
  13: { name: "FPE", label: "Finished Pens", live: false, terminal: true }
};

export function LiveMatchScoreboard({
  fixtureId,
  initialSummary
}: {
  fixtureId: string | number;
  initialSummary?: ScoreSummary;
}) {
  const [streamedSummary, setStreamedSummary] = useState<ScoreSummary | undefined>(initialSummary);
  const [clockBase, setClockBase] = useState<{ seconds: number; running: boolean; receivedAt: number } | null>(() => {
    const clock = initialSummary?.latest?.Clock;
    return typeof clock?.Seconds === "number"
      ? { seconds: clock.Seconds, running: Boolean(clock.Running), receivedAt: Date.now() }
      : null;
  });
  const [now, setNow] = useState(Date.now());

  const { data } = useQuery<ScoreResponse>({
    queryKey: ["match-scoreboard", fixtureId],
    queryFn: async () => {
      const response = await fetch(`/api/scores/${fixtureId}`);
      if (!response.ok) throw new Error("Unable to load score.");
      return response.json();
    },
    initialData: initialSummary ? { summary: initialSummary } : undefined,
    refetchInterval: 10_000,
    retry: false
  });

  useEffect(() => {
    const summary = data?.summary;
    if (summary) {
      setStreamedSummary((current) => mergeSummaries(current, summary));
      const clock = summary.latest?.Clock;
      if (typeof clock?.Seconds === "number") {
        setClockBase({ seconds: clock.Seconds, running: Boolean(clock.Running), receivedAt: Date.now() });
      }
    }
  }, [data?.summary]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/scores/stream?fixtureId=${fixtureId}`);

    eventSource.onmessage = (message) => {
      try {
        const event = readScoreEvent(JSON.parse(message.data));
        if (!event || String(event.FixtureId) !== String(fixtureId)) return;
        setStreamedSummary((current) => mergeEvent(current ?? data?.summary ?? initialSummary, event));
        if (event.Clock && typeof event.Clock.Seconds === "number") {
          setClockBase({ seconds: event.Clock.Seconds, running: Boolean(event.Clock.Running), receivedAt: Date.now() });
        }
      } catch {
        // Heartbeats are not score events.
      }
    };

    return () => eventSource.close();
  }, [data?.summary, fixtureId, initialSummary]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const score = streamedSummary ?? data?.summary ?? initialSummary;
  const status = score?.status;
  const displaySeconds = useMemo(() => {
    if (!clockBase) return null;
    if (!clockBase.running) return clockBase.seconds;
    return clockBase.seconds + Math.floor((now - clockBase.receivedAt) / 1000);
  }, [clockBase, now]);
  const live = Boolean(status?.live || score?.isLive);

  return (
    <div className="grid justify-items-center gap-3">
      <div className="text-5xl font-black text-white">
        {score?.participant1?.goals ?? 0} - {score?.participant2?.goals ?? 0}
      </div>
      <div className={`inline-flex items-center gap-2 rounded-[14px] px-6 py-3 text-lg font-black ${live ? "bg-[var(--accent)] text-[#071008]" : "bg-[#11171b] text-white/70"}`}>
        {live ? <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_14px_rgba(255,45,72,0.9)]" /> : <Clock3 className="h-5 w-5" />}
        <span>{status?.name ?? status?.label ?? "NS"}</span>
        {displaySeconds !== null && <span>{formatMatchClock(displaySeconds)}</span>}
      </div>
      <div className="text-xs font-black uppercase tracking-wider text-white/45">
        {status?.label ?? score?.latest?.GameState ?? "Score updating"}
      </div>
    </div>
  );
}

function mergeSummaries(current: ScoreSummary | undefined, next: ScoreSummary): ScoreSummary {
  return {
    ...current,
    ...next,
    participant1: {
      ...current?.participant1,
      ...next.participant1,
      goals: next.participant1?.goals ?? current?.participant1?.goals ?? 0
    },
    participant2: {
      ...current?.participant2,
      ...next.participant2,
      goals: next.participant2?.goals ?? current?.participant2?.goals ?? 0
    },
    latest: { ...current?.latest, ...next.latest }
  };
}

function mergeEvent(summary: ScoreSummary | undefined, event: ScoreEvent): ScoreSummary {
  const statusBase = event.StatusId ? STATUS_LABELS[event.StatusId] : null;
  const status = statusBase
    ? { ...statusBase, phase: statusBase.live ? "live" : statusBase.terminal ? "finished" : "break" }
    : summary?.status ?? null;
  const score = event.Score;

  return {
    ...summary,
    latest: { ...summary?.latest, ...event },
    statusId: event.StatusId ?? summary?.statusId ?? null,
    status,
    isLive: status?.live ?? summary?.isLive ?? false,
    participant1: {
      ...summary?.participant1,
      goals: score?.Participant1?.Total?.Goals ?? summary?.participant1?.goals ?? 0,
      yellowCards: score?.Participant1?.Total?.YellowCards ?? summary?.participant1?.yellowCards ?? 0,
      redCards: score?.Participant1?.Total?.RedCards ?? summary?.participant1?.redCards ?? 0,
      corners: score?.Participant1?.Total?.Corners ?? summary?.participant1?.corners ?? 0
    },
    participant2: {
      ...summary?.participant2,
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

function formatMatchClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
