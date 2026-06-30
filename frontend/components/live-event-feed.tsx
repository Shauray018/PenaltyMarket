"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock3, Radio, WifiOff } from "lucide-react";

type ScoreEvent = {
  FixtureId?: number;
  Action?: string;
  Id?: number;
  Ts?: number;
  ConnectionId?: number;
  Seq?: number;
  StatusId?: number;
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
};

type ScoreTotals = {
  Goals?: number;
  YellowCards?: number;
  RedCards?: number;
  Corners?: number;
};

type FeedItem =
  | { kind: "heartbeat"; ts?: number; receivedAt: number }
  | { kind: "event"; event: ScoreEvent; receivedAt: number };

const MAX_ITEMS = 24;

export function LiveEventFeed({ fixtureId, active = false }: { fixtureId: string | number; active?: boolean }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "disconnected">(active ? "connecting" : "idle");
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!active) {
      setConnectionState("idle");
      setItems([]);
      seen.current.clear();
      return;
    }

    setConnectionState("connecting");
    setItems([]);
    seen.current.clear();

    const eventSource = new EventSource(`/api/scores/stream?fixtureId=${fixtureId}`);

    eventSource.onopen = () => setConnectionState("connected");
    eventSource.onerror = () => {
      setConnectionState("disconnected");
      // Do not close here. Browser EventSource will reconnect automatically.
    };

    eventSource.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data);
        const event = readScoreEvent(parsed);
        if (!event) return;
        if (String(event.FixtureId) !== String(fixtureId)) return;

        const key = `${event.FixtureId ?? "fixture"}:${event.ConnectionId ?? ""}:${event.Seq ?? ""}:${event.Id ?? ""}:${event.Ts ?? ""}`;
        if (seen.current.has(key)) return;
        seen.current.add(key);

        setConnectionState("connected");
        const item: FeedItem = { kind: "event", event, receivedAt: Date.now() };
        setItems((current) => [item, ...current].slice(0, MAX_ITEMS));
      } catch {
        // Named heartbeat events are handled below; malformed frames are ignored.
      }
    };

    eventSource.addEventListener("heartbeat", (message) => {
      try {
        const parsed = JSON.parse((message as MessageEvent).data) as { Ts?: number };
        setConnectionState("connected");
        const item: FeedItem = { kind: "heartbeat", ts: parsed.Ts, receivedAt: Date.now() };
        setItems((current) => [item, ...current].slice(0, MAX_ITEMS));
      } catch {
        setConnectionState("connected");
      }
    });

    return () => eventSource.close();
  }, [active, fixtureId]);

  const events = useMemo(() => items.filter((item) => item.kind === "event").length, [items]);

  return (
    <section className="win95-window">
      <div className="win95-titlebar">
        <span>LIVE_FEED.EXE</span>
        <ConnectionPill state={connectionState} />
      </div>
      <div className="win95-window-body">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black">
            <Radio className="h-5 w-5 text-[#000080]" />
            Live Feed
          </h2>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">{events} match events received</p>
        </div>
      </div>

      <div className="max-h-[360px] overflow-auto pr-1">
        {items.length ? (
          <div className="grid gap-2">
            {items.map((item, index) =>
              item.kind === "heartbeat" ? (
                <HeartbeatRow key={`heartbeat-${item.receivedAt}-${index}`} item={item} />
              ) : (
                <EventRow key={`${item.event.FixtureId}-${item.event.Seq}-${item.event.Id}-${item.event.Ts}-${index}`} event={item.event} />
              )
            )}
          </div>
        ) : (
          <div className="win95-panel-inset bg-white p-4 text-sm font-bold text-[var(--muted)]">
            {active ? "Waiting for live TxLINE score events..." : "Live feed starts when the match goes live."}
          </div>
        )}
      </div>
      </div>
    </section>
  );
}

function EventRow({ event }: { event: ScoreEvent }) {
  const score = currentScore(event);
  const detail = eventDetail(event);

  return (
    <article className="win95-panel-inset bg-[#efefdf] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="market-open px-2 py-1 text-[10px] font-black uppercase">
              {prettyAction(event.Action)}
            </span>
            {event.Participant && (
              <span className="bg-[#c0c0c0] px-2 py-1 text-[10px] font-black">
                Team {event.Participant}
              </span>
            )}
          </div>
          {detail && <p className="mt-2 text-sm font-bold text-[var(--muted)]">{detail}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1 text-sm font-black">
            <Clock3 className="h-4 w-4 text-[var(--muted)]" />
            {formatClock(event.Clock?.Seconds)}
          </div>
          <div className="mt-1 text-xs font-bold text-[var(--muted)]">Seq {event.Seq ?? "-"}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] font-black">
        <div className="bg-white px-1 py-2">
          Score <span className="ml-1 text-[#000080]">{score}</span>
        </div>
        <div className="bg-white px-1 py-2">
          Status <span className="ml-1 text-[#000080]">{statusName(event.StatusId)}</span>
        </div>
        <div className="bg-white px-1 py-2 text-[#000080]">
          {formatTime(event.Ts)}
        </div>
      </div>
    </article>
  );
}

function HeartbeatRow({ item }: { item: Extract<FeedItem, { kind: "heartbeat" }> }) {
  return (
    <div className="win95-panel-inset flex items-center justify-between bg-white px-3 py-2 text-xs font-black text-[var(--muted)]">
      <span className="inline-flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#000080]" />
        heartbeat
      </span>
      <span>{formatTime(item.ts ?? item.receivedAt)}</span>
    </div>
  );
}

function ConnectionPill({ state }: { state: "idle" | "connecting" | "connected" | "disconnected" }) {
  const connected = state === "connected";
  const connecting = state === "connecting";
  const idle = state === "idle";

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black ${connected ? "market-open" : idle ? "market-closed" : connecting ? "bg-[#f6d045] text-black" : "market-live"}`}>
      {connected ? <Radio className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {state}
    </span>
  );
}

function readScoreEvent(value: unknown): ScoreEvent | null {
  if (!value || typeof value !== "object") return null;
  const maybeWrapped = value as { Update?: ScoreEvent };
  return maybeWrapped.Update ?? (value as ScoreEvent);
}

function prettyAction(action?: string) {
  if (!action) return "update";
  return action.replace(/_/g, " ");
}

function eventDetail(event: ScoreEvent) {
  if (event.Action === "shot" && typeof event.Data?.Outcome === "string") return `Shot ${event.Data.Outcome.toLowerCase()}`;
  if (event.Action === "free_kick" && typeof event.Data?.FreeKickType === "string") return `${event.Data.FreeKickType} free kick`;
  if (event.PossessionType) return event.PossessionType.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (event.Possession) return `Possession: team ${event.Possession}`;
  return null;
}

function currentScore(event: ScoreEvent) {
  const p1 = event.Score?.Participant1?.Total?.Goals ?? 0;
  const p2 = event.Score?.Participant2?.Total?.Goals ?? 0;
  return `${p1}-${p2}`;
}

function formatClock(seconds?: number) {
  if (typeof seconds !== "number") return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTime(ts?: number) {
  if (!ts) return "now";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(ts));
}

function statusName(statusId?: number) {
  if (statusId === 2) return "H1";
  if (statusId === 4) return "H2";
  if (statusId === 3) return "HT";
  if (statusId === 5) return "FT";
  if (statusId === 7) return "ET1";
  if (statusId === 9) return "ET2";
  if (statusId === 12) return "PEN";
  return statusId ? String(statusId) : "-";
}
