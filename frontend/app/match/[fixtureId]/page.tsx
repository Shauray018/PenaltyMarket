import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, Clock3, ShieldCheck, Trophy, TrendingUp, Users, WalletCards, Zap } from "lucide-react";
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
  const outcomeLabels = [teamCode(home), "DRAW", teamCode(away)];
  const closeTimes = data.markets.map((market) => Number(market.account?.closeTime ?? 0) * 1000).filter(Boolean);
  const kickoffEstimate = closeTimes.length ? Math.min(...closeTimes) + 5 * 60 * 1000 : score.summary?.latest?.StartTime;
  const timing = marketTiming(kickoffEstimate);
  const pool = matchWinner?.account?.totalStaked ?? "0";
  const stakes = matchWinner?.account?.outcomeStakes ?? ["0", "0", "0"];
  const bestOdds = bestDisplayOdds(stakes);
  const activeForOdds = Boolean(score.summary?.isLive || score.summary?.status?.phase === "break" || fixture?.isLive || fixture?.phase === "break");
  const status = score.summary?.status ?? fixture?.status;

  return (
    <div className="grid gap-9">
      <nav className="flex items-center gap-3 text-sm font-black text-white/55">
        <Link href="/" className="hover:text-[var(--accent)]">Markets</Link>
        <ArrowRight className="h-4 w-4" />
        <span>Premier League</span>
        <ArrowRight className="h-4 w-4" />
        <span className="text-[var(--accent)]">Match #{fixtureId}</span>
      </nav>

      <section className={`soft-panel relative overflow-hidden p-10 md:p-16 ${activeForOdds ? "live-shimmer" : ""}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_36%)]" />
        <div className="relative grid gap-10 text-center">
          <div className="mx-auto flex items-center gap-2 rounded-full bg-[#23282b] px-5 py-2 text-xs font-black text-white/70">
            {activeForOdds && <span className="live-dot" />}
            {status?.label ?? fixture?.phase ?? "Match"} • Fixture {fixtureId}
          </div>
          <div className="grid items-center gap-8 md:grid-cols-[1fr_160px_1fr]">
            <TeamBlock name={home} />
            <LiveMatchScoreboard fixtureId={fixtureId} initialSummary={score.summary} />
            <TeamBlock name={away} />
          </div>
          <div className="text-base font-bold text-white/55">
            {kickoffEstimate ? `${formatKickoff(kickoffEstimate)} • ` : ""}Fixture {fixtureId}
            {score.summary?.latest?.GameState ? ` • ${score.summary.latest.GameState}` : ""}
          </div>
        </div>
      </section>


      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <main className="grid gap-8">
          {/* <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                <Zap className="h-6 w-6 text-[var(--accent)]" />
                Market Outcomes
              </h2>
              <div className="text-sm font-black text-white/55">
                Pool Closure: {timing.bettingClosed ? "Closed" : "Before kickoff"}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {options.slice(0, 3).map((option, index) => (
                <OutcomeCard key={option} option={option} stake={stakes[index] ?? "0"} selected={index === 0} />
              ))}
            </div>
          </section> */}

          <LiveOddsChart fixtureId={fixtureId} home={home} away={away} active={activeForOdds} />

          <section className="soft-panel p-6">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-black text-white">
              <ShieldCheck className="h-5 w-5 text-white/50" />
              Market Rules & Settlement
            </h2>
            <div className="grid gap-4 text-sm font-bold text-white/55 md:grid-cols-2">
              <p>• Settlement based on final score validated by TxODDS proofs.</p>
              <p>• Pool stays open until official kickoff buffer closes.</p>
              <p>• Payouts are processed instantly via smart contract.</p>
              <p>• Minimum stake: 0.01 SOL.</p>
            </div>
          </section>
        </main>

        <aside className="grid h-fit gap-8">
          <MatchBetPanel fixtureId={fixtureId} labels={outcomeLabels} />

          <section className="soft-panel p-5">
            <h2 className="mb-4 text-lg font-black text-white">Live Score</h2>
            <LiveScore fixtureId={fixtureId} stream />
          </section>

          <LiveEventFeed fixtureId={fixtureId} />
        </aside>
      </div>

      <Link href="/" className="mt-8 flex items-center gap-2 text-sm font-black text-white/70">Back to Markets <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}

function TeamBlock({ name }: { name: string }) {
  const flag = flagUrlForTeam(name, 64);

  return (
    <div className="grid justify-items-center gap-5">
      <div className="grid h-18 overflow-hidden w-24 place-items-center rounded-2xl  bg-[#171b1d]">
        {flag ? (
          <img alt={`${name} flag`} className="h-30 w-24 rounded-md -mt-6" src={flag} />
        ) : (
          <div className="grid h-16 w-16 place-items-center bg-white text-xs font-black text-black">{name.slice(0, 3).toUpperCase()}</div>
        )}
      </div>
      <h1 className="text-4xl font-black text-white">{name}</h1>
    </div>
  );
}

function CountdownPill({ startTime }: { startTime?: number }) {
  const label = startTime ? formatDuration(Number(startTime) - Date.now()) : "04:22:15";
  return (
    <div className="inline-flex items-center gap-2 rounded-[14px] bg-[var(--accent)] px-6 py-3 text-xl font-black text-[#071008]">
      <Clock3 className="h-5 w-5" />
      {label}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <section className="soft-panel flex items-center gap-5 p-6">
      <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#080c0d]">{icon}</div>
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-white/45">{label}</div>
        <div className="text-2xl font-black text-white">{value}</div>
      </div>
    </section>
  );
}

function OutcomeCard({ option, stake, selected }: { option: string; stake: string; selected?: boolean }) {
  return (
    <section className={`rounded-[18px] border p-6 ${selected ? "border-[var(--accent)] bg-[#06130b]" : "border-[#283135] bg-black"}`}>
      <div className="text-xs font-black uppercase tracking-wider text-white/45">{option}</div>
      <div className="mt-2 text-4xl font-black text-white">{stake === "0" ? "2.4x" : "Live"}</div>
      <div className="mt-8 border-t border-[#20282b] pt-4">
        <div className="flex justify-between text-xs font-black uppercase text-white/45">
          <span>Staked</span>
          <span className="text-white">{formatSol(stake)}</span>
        </div>
      </div>
    </section>
  );
}

function bestDisplayOdds(stakes: string[]) {
  const total = stakes.reduce((sum, item) => sum + Number(item), 0);
  if (!total) return "3.25x";
  const maxStake = Math.max(...stakes.map(Number), 1);
  return `${Math.max(1.1, total / maxStake).toFixed(2)}x`;
}

function formatDuration(ms: number) {
  const safe = Math.max(0, ms);
  const hours = Math.floor(safe / 3_600_000);
  const mins = Math.floor((safe % 3_600_000) / 60_000);
  const secs = Math.floor((safe % 60_000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function teamCode(name: string) {
  const words = name.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "TBD";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}
