import { headers } from "next/headers";
import Link from "next/link";
import { Activity, ArrowLeft, CalendarClock, CircleDollarSign, Flag, ShieldCheck, Trophy, Users } from "lucide-react";
import { LiveEventFeed } from "@/components/live-event-feed";
import { LiveMatchScoreboard } from "@/components/live-match-scoreboard";
import { LiveOddsChart } from "@/components/live-odds-chart";
import { LiveScore } from "@/components/live-score";
import { MatchBetPanel } from "@/components/match-bet-panel";
import { flagUrlForTeam } from "@/lib/flags";
import { formatKickoff, formatSol } from "@/lib/format";
import { marketTiming } from "@/lib/market-policy";

type MarketAccount = {
  options?: string[];
  outcomeStakes?: string[];
  totalStaked?: string;
  liquidityDeposited?: string;
  liquidityWithdrawn?: string;
  traderCount?: number;
  status?: Record<string, unknown>;
  closeTime?: string;
};

type MarketsResponse = {
  markets: Array<{
    publicKey: string;
    marketType: { index: number; label: string; options: readonly string[] };
    exists: boolean;
    account: null | MarketAccount;
  }>;
};

type ScoreResponse = {
  summary?: {
    latest?: {
      StartTime?: number;
      GameState?: string;
    };
    status?: {
      name: string;
      label: string;
      phase: string;
      live: boolean;
      terminal: boolean;
    } | null;
    isLive?: boolean;
    isFinished?: boolean;
    participant1?: { goals: number; yellowCards: number; redCards: number; corners: number };
    participant2?: { goals: number; yellowCards: number; redCards: number; corners: number };
  };
};

type FixturesResponse = {
  fixtures?: Array<{
    fixtureId: number;
    participant1: string;
    participant2: string;
    startTime?: number;
    phase?: string;
    isLive?: boolean;
    status?: { name: string; label: string; phase: string } | null;
  }>;
};

async function appBaseUrl() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
}

async function getMarkets(fixtureId: string): Promise<MarketsResponse> {
  const baseUrl = await appBaseUrl();
  const response = await fetch(`${baseUrl}/api/markets/${fixtureId}`, { cache: "no-store" });
  return response.json();
}

async function getScore(fixtureId: string): Promise<ScoreResponse> {
  const baseUrl = await appBaseUrl();
  const response = await fetch(`${baseUrl}/api/scores/${fixtureId}`, { cache: "no-store" });
  if (!response.ok) return {};
  return response.json();
}

async function getFixture(fixtureId: string) {
  const baseUrl = await appBaseUrl();
  const response = await fetch(`${baseUrl}/api/fixtures`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = (await response.json()) as FixturesResponse;
  return data.fixtures?.find((fixture) => String(fixture.fixtureId) === String(fixtureId)) ?? null;
}

export default async function MatchPage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const [data, score, fixture] = await Promise.all([getMarkets(fixtureId), getScore(fixtureId), getFixture(fixtureId)]);
  const matchWinner = data.markets.find((market) => market.marketType.index === 0);
  const home = matchWinner?.account?.options?.[0] ?? fixture?.participant1 ?? "Team 1";
  const away = matchWinner?.account?.options?.[2] ?? fixture?.participant2 ?? "Team 2";
  const options = [home, "Draw", away];
  const title = `${home} vs ${away}`;
  const closeTimes = data.markets.map((market) => Number(market.account?.closeTime ?? 0) * 1000).filter(Boolean);
  const onChainCloseTimeMs = closeTimes.length ? Math.min(...closeTimes) : undefined;
  const kickoffEstimate = score.summary?.latest?.StartTime ?? fixture?.startTime;
  const timing = marketTiming(kickoffEstimate, Date.now(), onChainCloseTimeMs);
  const pool = displayPoolLamports(matchWinner?.account);
  const stakes = matchWinner?.account?.outcomeStakes ?? ["0", "0", "0"];
  const activeForOdds = Boolean(score.summary?.isLive || score.summary?.status?.phase === "break" || fixture?.isLive || fixture?.phase === "break");
  const status = score.summary?.status ?? fixture?.status;
  const betMarkets = data.markets
    .filter((market) => market.exists && market.account)
    .sort((a, b) => a.marketType.index - b.marketType.index);
  const secondaryMarkets = betMarkets.filter((market) => market.marketType.index !== 0);

  return (
    <div className="grid gap-3">
      <Link href="/" className="win95-button w-fit">
        <ArrowLeft className="h-4 w-4" />
        Markets
      </Link>

      <section className="win95-window overflow-hidden">
        <div className="win95-titlebar">
          <span>{activeForOdds ? "LIVE_MATCH.EXE" : "MATCH_FILE.EXE"}</span>
          <span className={activeForOdds ? "market-live px-1.5 py-0.5 text-[10px] font-black" : "market-open px-1.5 py-0.5 text-[10px] font-black"}>
            {status?.name ?? fixture?.phase ?? "READY"}
          </span>
        </div>
        <div className="relative overflow-hidden bg-[#0a6f18] p-3 text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,.28)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.22)_1px,transparent_1px)] bg-[size:32px_32px]" />
          </div>
          <div className="relative grid gap-3 text-center">
            <div className="mx-auto inline-flex items-center gap-2 bg-[#c0c0c0] px-2 py-1 text-[11px] font-black uppercase text-black">
              {activeForOdds && <span className="blink-dot" />}
              {title} - {status?.label ?? "Match Terminal"}
            </div>
            <div className="grid grid-cols-[1fr_112px_1fr] items-center gap-2">
              <TeamBlock name={home} align="right" />
              <LiveMatchScoreboard fixtureId={fixtureId} initialSummary={score.summary} active={Boolean(score.summary?.isLive)} />
              <TeamBlock name={away} />
            </div>
            <div className="mx-auto max-w-xs text-xs font-black uppercase leading-5 [text-shadow:1px_1px_0_#003b16]">
              {kickoffEstimate ? `${formatKickoff(kickoffEstimate)} - ` : ""}
              {score.summary?.latest?.GameState ?? (timing.bettingClosed ? "Betting Closed" : "Kickoff Soon")}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
        <main className="grid gap-3">
          

          <section className="win95-window">
            <div className="win95-titlebar">
              <span>ODDS_SCOPE.EXE</span>
              <span className="text-[10px] font-black">{activeForOdds ? "STREAM" : "SNAPSHOT"}</span>
            </div>
            <div className="win95-window-body">
              <LiveOddsChart fixtureId={fixtureId} home={home} away={away} active={activeForOdds} />
            </div>
          </section>

          {secondaryMarkets.length > 0 && (
            <section className="win95-window">
              <div className="win95-titlebar">
                <span>PROP_MARKETS.EXE</span>
                <span className="text-[10px] font-black">{secondaryMarkets.length} SLIPS</span>
              </div>
              <div className="win95-window-body">
                <div className="grid gap-3 xl:grid-cols-2">
                  {secondaryMarkets.map((market) => {
                    const marketOptions = marketOutcomes(market, home, away);
                    return (
                      <MatchBetPanel
                        key={market.marketType.index}
                        fixtureId={fixtureId}
                        title={market.marketType.label}
                        marketType={market.marketType.index}
                        labels={marketOptions.map(optionCode)}
                        outcomeLabels={marketOptions}
                        marketExists={Boolean(market.exists)}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <section className="win95-window">
            <div className="win95-titlebar">
              <span>POOL_SPLIT.EXE</span>
            </div>
            <div className="win95-window-body grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon={<CircleDollarSign className="h-4 w-4" />} label="Pool" value={formatSol(pool)} />
                <StatCard icon={<Users className="h-4 w-4" />} label="Refs" value={String(matchWinner?.account?.traderCount ?? 0)} />
                <StatCard icon={<CalendarClock className="h-4 w-4" />} label="Window" value={timing.bettingClosed ? "Closed" : "Open"} />
              </div>
              <PoolSplit options={options} stakes={stakes} />
            </div>
          </section>

          <section className="win95-window">
            <div className="win95-titlebar">
              <span>RULEBOOK.TXT</span>
            </div>
            <div className="win95-window-body grid gap-2 text-xs font-bold leading-5 text-[var(--muted)]">
              <p className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#000080]" />
                Settlement uses final score validation with TxODDS proofs.
              </p>
              <p className="flex gap-2">
                <Flag className="mt-0.5 h-4 w-4 shrink-0 text-[#000080]" />
                Pools stay open through the live betting window and claims unlock after resolution.
              </p>
            </div>
          </section>
        </main>

        <aside className="grid h-fit gap-3">
          {matchWinner && (
            <MatchBetPanel
              fixtureId={fixtureId}
              title={title}
              marketType={0}
              labels={marketOutcomes(matchWinner, home, away).map(optionCode)}
              outcomeLabels={marketOutcomes(matchWinner, home, away)}
              marketExists={Boolean(matchWinner.exists)}
            />
          )}

          <section className="win95-window">
            <div className="win95-titlebar">
              <span>SCORE.EXE</span>
            </div>
            <div className="win95-window-body">
              <LiveScore fixtureId={fixtureId} initialSummary={score.summary} stream={Boolean(score.summary?.isLive)} />
            </div>
          </section>

          <LiveEventFeed fixtureId={fixtureId} active={Boolean(score.summary?.isLive)} />
        </aside>
      </div>
    </div>
  );
}

function TeamBlock({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  const flag = flagUrlForTeam(name, 64);

  return (
    <div className={`grid gap-1 ${align === "right" ? "justify-items-end text-right" : "justify-items-start text-left"}`}>
      <div className="grid h-12 w-16 place-items-center overflow-hidden border-2 border-white bg-[#c0c0c0] shadow-[2px_2px_0_rgba(0,0,0,.35)]">
        {flag ? (
          <img alt={`${name} flag`} className="h-full w-full object-cover" src={flag} />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs font-black text-black">{teamCode(name)}</div>
        )}
      </div>
      <h1 className="max-w-[120px] text-lg font-black uppercase leading-5 [text-shadow:2px_2px_0_#003b16]">{name}</h1>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="win95-panel-inset min-w-0 bg-white p-2">
      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-[var(--muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black text-[#000080]">{value}</div>
    </div>
  );
}

function PoolSplit({ options, stakes }: { options: string[]; stakes: string[] }) {
  const total = stakes.reduce((sum, stake) => sum + BigInt(stake || "0"), 0n);

  return (
    <div className="grid gap-2">
      {options.map((option, index) => {
        const stake = BigInt(stakes[index] ?? "0");
        const percent = total > 0n ? Number((stake * 10_000n) / total) / 100 : index === 1 ? 20 : 40;
        return (
          <div className="grid gap-1" key={`${option}-${index}`}>
            <div className="flex items-center justify-between gap-2 text-xs font-black">
              <span className="truncate">{option}</span>
              <span>{percent.toFixed(1)}%</span>
            </div>
            <div className="win95-progress">
              <div className="win95-progress-fill" style={{ width: `${Math.max(4, percent)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function displayPoolLamports(account: MarketAccount | null | undefined) {
  const totalStaked = BigInt(account?.totalStaked ?? "0");
  const deposited = BigInt(account?.liquidityDeposited ?? "0");
  const withdrawn = BigInt(account?.liquidityWithdrawn ?? "0");
  const liquidity = deposited > withdrawn ? deposited - withdrawn : 0n;
  return (totalStaked + liquidity).toString();
}

function teamCode(name: string) {
  const words = name.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "TBD";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

function optionCode(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("over")) return lineLabel(label, "OVER");
  if (normalized.includes("under")) return lineLabel(label, "UNDER");
  if (normalized === "yes") return "YES";
  if (normalized === "no") return "NO";
  if (normalized === "none") return "NON";
  if (normalized === "draw") return "DRAW";
  return teamCode(label);
}

function lineLabel(label: string, side: "OVER" | "UNDER") {
  const line = label.match(/\d+(?:\.\d+)?/)?.[0];
  return line ? `${side} ${line}` : side;
}

function marketOutcomes(market: MarketsResponse["markets"][number], home: string, away: string) {
  const options = market.account?.options?.length ? market.account.options : [...market.marketType.options];
  return options.map((option) => {
    if (option === "Team 1") return home;
    if (option === "Team 2") return away;
    return option;
  });
}
