"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, WifiOff } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
  home: { color: "#2f82ff" },
  draw: { color: "#96a0b3" },
  away: { color: "#f0d400" }
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
  const [state, setState] = useState<"loading" | "live" | "paused" | "waiting">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      setState(active ? "waiting" : "paused");
      try {
        const response = await fetch(`/api/odds/${fixtureId}`);
        const payload = await response.json();
        const primary = normalizeMatchWinner(payload.primary);
        if (cancelled || !primary) return;
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
  const readoutTops = useMemo(() => (latestPoint ? getReadoutTops(latestPoint) : null), [latestPoint]);

  return (
    <section className="relative">
      <div className="win95-panel-inset relative h-[260px] overflow-hidden bg-[#080d16] p-0 sm:h-[300px]">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-normal text-[#74819b]">
          <span className={`inline-flex items-center gap-1 px-2 py-1 ${state === "live" ? "bg-[#123f27] text-[#71f5ac]" : "bg-[#1a2230] text-[#a5afc2]"}`}>
            {state === "live" ? <Radio className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {state === "live" ? "Live" : active ? "Waiting" : "Paused"}
          </span>
          <span>TxLINE {active ? "stream" : "snapshot"}</span>
        </div>

        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 18, right: 104, bottom: 22, left: 0 }}>
              <CartesianGrid stroke="rgba(91, 108, 135, 0.22)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#7f8aa3", fontSize: 10, fontWeight: 700 }}
                axisLine={{ stroke: "rgba(91, 108, 135, 0.2)" }}
                tickLine={false}
                minTickGap={42}
              />
              <YAxis
                domain={[0, 100]}
                orientation="right"
                ticks={[0, 20, 40, 60, 80, 100]}
                hide
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                contentStyle={{ background: "#101722", border: "1px solid #263347", borderRadius: 0, color: "#e7eefc", fontWeight: 700 }}
                itemStyle={{ fontWeight: 900 }}
                labelStyle={{ color: "#aeb8cc", fontWeight: 900 }}
                formatter={(value, name) => {
                  const key = name as ChartKey;
                  const numeric = typeof value === "number" ? value : Number(value);
                  const label = CHART_KEYS.includes(key) ? labels[key] : String(name);
                  return [`${Number.isFinite(numeric) ? numeric.toFixed(1) : value}%`, label];
                }}
                labelFormatter={(label) => `Time ${label}`}
              />
              {CHART_KEYS.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={CHART_STYLE[key].color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: CHART_STYLE[key].color }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-center text-sm font-black text-[#96a0b3]">Waiting for TxLINE match-winner odds</div>
        )}

        {latestPoint && readoutTops && (
          <div className="pointer-events-none absolute bottom-8 right-12 top-5 z-20 w-16 sm:w-20">
            {CHART_KEYS.map((key) => (
              <div key={key} className="absolute right-0 -translate-y-1/2 text-right" style={{ top: `${readoutTops[key]}%` }}>
                <div className="text-[10px] font-black uppercase leading-none sm:text-[11px]" style={{ color: CHART_STYLE[key].color }}>
                  {labels[key]}
                </div>
                <div className="text-xl font-black leading-none sm:text-2xl" style={{ color: CHART_STYLE[key].color }}>
                  {Math.round(latestPoint[key])}%
                </div>
              </div>
            ))}
          </div>
        )}

        {chartData.length > 0 && (
          <div className="pointer-events-none absolute bottom-8 right-2 top-5 z-10 flex flex-col justify-between text-right text-[10px] font-bold leading-none text-[#7f8aa3]">
            {[100, 80, 60, 40, 20, 0].map((tick) => (
              <span key={tick}>{tick}%</span>
            ))}
          </div>
        )}

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

function getReadoutTops(point: ChartPoint): Record<ChartKey, number> {
  const tops = CHART_KEYS.map((key) => ({
    key,
    top: 100 - point[key]
  })).sort((a, b) => a.top - b.top);
  const minGap = 16;
  const minTop = 7;
  const maxTop = 93;

  for (let index = 1; index < tops.length; index += 1) {
    tops[index].top = Math.max(tops[index].top, tops[index - 1].top + minGap);
  }

  const overflow = tops.at(-1)!.top - maxTop;
  if (overflow > 0) {
    tops.forEach((item) => {
      item.top -= overflow;
    });
  }

  const underflow = minTop - tops[0].top;
  if (underflow > 0) {
    tops.forEach((item) => {
      item.top += underflow;
    });
  }

  return tops.reduce(
    (result, item) => ({
      ...result,
      [item.key]: item.top
    }),
    {} as Record<ChartKey, number>
  );
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
