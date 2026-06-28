"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, WifiOff } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type OddsRecord = {
  FixtureId: number;
  MessageId: string;
  Ts: number;
  SuperOddsType: string;
  InRunning: boolean;
  MarketPeriod?: string | null;
  PriceNames: string[];
  Prices: number[];
  Pct: string[];
};

type ChartPoint = {
  ts: number;
  time: string;
  home: number;
  draw: number;
  away: number;
};

const MAX_POINTS = 100;
const CHART_KEYS = ["home", "draw", "away"] as const;
type ChartKey = (typeof CHART_KEYS)[number];

const CHART_STYLE: Record<ChartKey, { color: string }> = {
  home: { color: "#0fb981" },
  draw: { color: "#8c96aa" },
  away: { color: "#ff3347" }
};

export function LiveOddsChart({
  fixtureId,
  home,
  away,
  active
}: {
  fixtureId: string | number;
  home: string;
  away: string;
  active: boolean;
}) {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [latest, setLatest] = useState<OddsRecord | null>(null);
  const [state, setState] = useState<"loading" | "live" | "paused" | "waiting">("loading");
  const [activeChart, setActiveChart] = useState<ChartKey>("home");
  const [userSelectedChart, setUserSelectedChart] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      setState(active ? "waiting" : "paused");
      try {
        const response = await fetch(`/api/odds/${fixtureId}`);
        const payload = await response.json();
        const primary = normalizeMatchWinner(payload.primary);
        if (cancelled || !primary) return;
        setLatest(primary);
        setPoints([recordToPoint(primary)]);
      } catch {
        if (!cancelled) setState(active ? "waiting" : "paused");
      }
    }

    loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [active, fixtureId]);

  useEffect(() => {
    if (!active) {
      setState("paused");
      return;
    }

    setState((current) => (current === "loading" ? "waiting" : "live"));
    const eventSource = new EventSource(`/api/odds/stream?fixtureId=${fixtureId}`);

    eventSource.onopen = () => setState("live");
    eventSource.onerror = () => setState("waiting");
    eventSource.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data);
        const record = normalizeMatchWinner(parsed?.Update ?? parsed);
        if (!record) return;
        if (String(record.FixtureId) !== String(fixtureId)) return;

        setState("live");
        setLatest(record);
        setPoints((current) => {
          if (current.some((point) => point.ts === record.Ts)) return current;
          return [...current, recordToPoint(record)].sort((a, b) => a.ts - b.ts).slice(-MAX_POINTS);
        });
      } catch {
        // Ignore heartbeat/non-JSON frames.
      }
    };

    return () => eventSource.close();
  }, [active, fixtureId]);

  const chartData = normalizeChartData(points);
  const latestPoint = points.at(-1) ?? chartData.at(-1);
  const labels = useMemo(() => ({ home: teamCode(home), draw: "Draw", away: teamCode(away) }), [away, home]);
  const chartMax = Math.max(80, ...chartData.map((point) => point[activeChart]), 0);

  useEffect(() => {
    if (!latestPoint || userSelectedChart) return;
    const highest = CHART_KEYS.reduce((winner, key) => (latestPoint[key] > latestPoint[winner] ? key : winner), "home" as ChartKey);
    setActiveChart(highest);
  }, [latestPoint, userSelectedChart]);

  return (
    <section className="relative overflow-hidden rounded-[22px] bg-inherit p-6 shadow-2xl">
      <div className="flex flex-col gap-5  border-[#151c28] p-6 md:flex-row md:items-stretch md:justify-between md:p-0 md:pl-6">
        <div>
          <h2 className="text-xl font-black text-white">Live Odds</h2>
          <p className="mt-1 text-sm font-bold text-[#7d8aa3]">
            Match winner probability from TxLINE {active ? "stream" : "snapshot"}
          </p>
          <span className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${state === "live" ? "bg-inherit text-[var(--accent)]" : "bg-inherit text-[#8d99b5]"}`}>
            {state === "live" ? <Radio className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {state === "live" ? "Live" : active ? "Waiting" : "Paused"}
          </span>
        </div>
        <div className="grid grid-cols-3 md:min-w-[420px]">
          {CHART_KEYS.map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="border-t border-[#151c28] px-4 py-4 text-left transition data-[active=true]:bg-[#000000] md:border-l md:border-t-0 md:px-6 md:py-6"
              onClick={() => {
                setActiveChart(key);
                setUserSelectedChart(true);
              }}
              type="button"
            >
              <span className="block text-xs font-black uppercase text-[#7d8aa3]">{labels[key]}</span>
              <span className="mt-2 block text-2xl font-black leading-none text-white" style={{ color: activeChart === key ? CHART_STYLE[key].color : undefined }}>
                {latestPoint ? `${Math.round(latestPoint[key])}%` : "--"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[390px] p-5 md:p-6">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 22, right: 22, bottom: 24, left: 2 }}>
              <CartesianGrid stroke="#1b2230" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#7890b7", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis domain={[0, Math.ceil(chartMax / 10) * 10]} orientation="right" tickFormatter={(value) => `${value}%`} tick={{ fill: "#7890b7", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ stroke: "#2b3448", strokeWidth: 1 }}
                contentStyle={{ background: "#090d14", border: "1px solid #1b2230", borderRadius: 12, color: "white" }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`, labels[activeChart]]}
                labelFormatter={(label) => `Time ${label}`}
              />
              <ReferenceLine y={40} stroke="#263044" strokeDasharray="3 4" />
              <Line
                type="monotone"
                dataKey={activeChart}
                name={activeChart}
                stroke={CHART_STYLE[activeChart].color}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-sm font-black text-[#7d8aa3]">Waiting for TxLINE match-winner odds</div>
        )}
y
        {!active && (
          <div className="absolute inset-0 grid place-items-center bg-inherit backdrop-blur-[1px]">
            <div className="-rotate-6 rounded-[18px] border border-[#342b75] bg-[#111028]/80 px-8 py-4 text-2xl font-black text-[#7f6bff]">
              Match not live
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-5 px-6 pb-6 text-sm font-black text-[#7786a6]">
        <span>3h</span>
        <span>24h</span>
        <span className="rounded-md bg-[#251e6b] px-2 py-0.5 text-white">7d</span>
        <span>30d</span>
        <span>ALL</span>
      </div>
    </section>
  );
}

function normalizeMatchWinner(value: unknown): OddsRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as OddsRecord;
  const names = record.PriceNames?.join(" ").toLowerCase() ?? "";
  const type = record.SuperOddsType?.toLowerCase() ?? "";
  if (!record.FixtureId || !Array.isArray(record.Pct) || record.Pct.length < 3) return null;
  if (record.MarketPeriod) return null;
  if (!(type.includes("1x2") || names.includes("draw"))) return null;
  return record;
}

function recordToPoint(record: OddsRecord): ChartPoint {
  const values = record.Pct.map(pctToNumber);
  return {
    ts: record.Ts,
    time: formatTime(record.Ts),
    home: values[0] ?? 0,
    draw: values[1] ?? 0,
    away: values[2] ?? 0
  };
}

function pctToNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

function normalizeChartData(points: ChartPoint[]) {
  if (points.length !== 1) return points;
  const point = points[0];
  return Array.from({ length: 12 }, (_, index) => {
    const ts = point.ts - (11 - index) * 60_000;
    return {
      ...point,
      ts,
      time: formatTime(ts)
    };
  });
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(ts));
}

function teamCode(name: string) {
  const words = name.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "TBD";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}
