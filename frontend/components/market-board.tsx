"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, Flag, Search, ShieldCheck, Trophy, Users } from "lucide-react";
import { flagUrlForTeam } from "@/lib/flags";
import { formatSol } from "@/lib/format";
import { useAppStore, type FixtureItem } from "@/lib/store";
import { ComingSoonOverlay } from "@/components/coming-soon-overlay";

const filterLabels: Array<{ value: "trending" | "live" | "open"; label: string }> = [
  { value: "trending", label: "Hot Board" },
  { value: "live", label: "Live" },
  { value: "open", label: "Kickoff Soon" }
];

export function MarketBoard() {
  const fixtures = useAppStore((state) => state.fixtures);
  const loading = useAppStore((state) => state.loadingFixtures);
  const query = useAppStore((state) => state.query);
  const setQuery = useAppStore((state) => state.setQuery);
  const filter = useAppStore((state) => state.filter);
  const setFilter = useAppStore((state) => state.setFilter);
  const loadFixtures = useAppStore((state) => state.loadFixtures);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    loadFixtures();
    const interval = window.setInterval(() => loadFixtures(true), 30_000);
    return () => window.clearInterval(interval);
  }, [loadFixtures]);

  const visibleFixtures = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return fixtures.filter((fixture) => {
      const searchMatch =
        !normalizedQuery ||
        `${fixture.participant1} ${fixture.participant2}`.toLowerCase().includes(normalizedQuery);
      if (!searchMatch) return false;
      if (filter === "live") return Boolean(fixture.isLive || fixture.phase === "break");
      if (filter === "open") return Boolean(fixture.timing?.bettingOpen || fixture.timing?.bettingProminent);
      return true;
    });
  }, [filter, fixtures, query]);

  const featured =
    visibleFixtures.find((fixture) => fixture.isLive || fixture.phase === "break") ??
    visibleFixtures.find((fixture) => fixture.timing?.bettingProminent) ??
    visibleFixtures[0];
  const visibleRows = visibleFixtures.slice(0, limit);

  return (
    <div className="grid gap-3">
      <MatchTicker fixtures={fixtures.length ? fixtures : visibleFixtures} />
      <FeaturedMarket fixture={featured} loading={loading} />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="win95-window">
          <div className="win95-titlebar">
            <span>MARKETS.EXE</span>
            <span className="text-[11px] font-black">{visibleFixtures.length} files</span>
          </div>
          <div className="win95-window-body grid gap-3">
            <MarketFilters filter={filter} query={query} setFilter={setFilter} setQuery={setQuery} />

            {loading && !visibleRows.length ? (
              <div className="win95-panel-inset grid min-h-32 place-items-center p-6 text-center text-sm font-black">
                <div>
                  <div className="mx-auto mb-3 h-5 w-44 win95-progress">
                    <div className="win95-progress-fill h-full w-2/3" />
                  </div>
                  VAR check in progress...
                </div>
              </div>
            ) : (
              <div className="grid gap-2 xl:grid-cols-2">
                {visibleRows.map((fixture) => (
                  <MarketRow key={fixture.fixtureId} fixture={fixture} />
                ))}
              </div>
            )}

            {!loading && !visibleFixtures.length && (
              <div className="win95-panel-inset grid min-h-32 place-items-center p-5 text-center">
                <div>
                  <div className="text-lg font-black">No markets found</div>
                  <div className="mt-1 text-xs font-bold text-[var(--muted)]">Try another club or filter.</div>
                </div>
              </div>
            )}

            {visibleFixtures.length > visibleRows.length && (
              <button className="win95-button w-full" type="button" onClick={() => setLimit((value) => value + 8)}>
                Load More Fixtures
              </button>
            )}
          </div>
        </section>

        <MarketsUtilityRail fixtures={fixtures} />
      </div>
    </div>
  );
}

function MatchTicker({ fixtures }: { fixtures: FixtureItem[] }) {
  const items = fixtures.slice(0, 10);
  const fallback = [
    "BRA vs ARG - referee warming up",
    "SOL pools syncing",
    "Full time claims ready after settlement"
  ];
  const labels = items.length
    ? items.map((fixture) => `${fixture.participant1} vs ${fixture.participant2} - ${formatFixtureTiming(fixture)}`)
    : fallback;
  const doubled = [...labels, ...labels];

  return (
    <section className="ticker-strip" aria-label="Live match ticker">
      <div className="ticker-track">
        {doubled.map((label, index) => (
          <span className="ticker-item" key={`${label}-${index}`}>
            <Flag className="h-3.5 w-3.5 text-[var(--warning)]" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function FeaturedMarket({ fixture, loading }: { fixture?: FixtureItem; loading: boolean }) {
  const title = fixture ? `${fixture.participant1} vs ${fixture.participant2}` : "Brazil vs Argentina";
  const flag1 = flagUrlForTeam(fixture?.participant1 ?? "Brazil", 64);
  const flag2 = flagUrlForTeam(fixture?.participant2 ?? "Argentina", 64);
  const matchWinner = fixture?.matchWinnerMarket ?? null;
  const pool = displayPoolLamports(matchWinner?.account);
  const status = fixture ? formatFixtureTiming(fixture) : loading ? "Loading" : "Kickoff Soon";
  const live = Boolean(fixture?.isLive || fixture?.phase === "break");

  return (
    <section className="win95-window overflow-hidden">
      <div className="win95-titlebar">
        <span>{live ? "LIVE_MATCH.EXE" : "FEATURED_MATCH.EXE"}</span>
        <span className="win95-window-controls" aria-hidden="true">
          <span>_</span>
          <span>□</span>
          <span>x</span>
        </span>
      </div>
      <div className="relative overflow-hidden bg-[#0a6f18] p-3 text-white">
        <div className="absolute inset-0 opacity-35">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,.28)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.22)_1px,transparent_1px)] bg-[size:28px_28px]" />
        </div>
        <div className="relative grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 bg-[#c0c0c0] px-2 py-1 text-[11px] font-black uppercase text-black">
              <Trophy className="h-4 w-4 text-[#8a6400]" />
              Be the Ref
            </div>
            <span className={`px-2 py-1 text-[11px] font-black uppercase ${live ? "market-live" : "market-open"}`}>{status}</span>
          </div>

          <Link className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-white no-underline" href={fixture ? `/match/${fixture.fixtureId}` : "/"}>
            <TeamBadge name={fixture?.participant1 ?? "Brazil"} flag={flag1} align="right" />
            <div className="grid h-16 w-16 place-items-center border-2 border-white bg-black text-xl font-black text-[var(--warning)] shadow-[3px_3px_0_rgba(0,0,0,.35)]">
              VS
            </div>
            <TeamBadge name={fixture?.participant2 ?? "Argentina"} flag={flag2} />
          </Link>

          <div className="grid grid-cols-3 gap-2 text-black">
            <FeaturedStat icon={<CircleDollarSign className="h-4 w-4" />} label="Pool" value={formatSol(pool)} />
            <FeaturedStat icon={<Users className="h-4 w-4" />} label="Refs" value={`${matchWinner?.account?.traderCount ?? 0}`} />
            <FeaturedStat icon={<CalendarClock className="h-4 w-4" />} label="Kickoff" value={fixture?.startTime ? formatShortCountdown(fixture.startTime) : "Demo"} />
          </div>

          <Link className="win95-button win95-button-primary w-full" href={fixture ? `/match/${fixture.fixtureId}` : "/"}>
            Open Match Terminal
          </Link>
        </div>
      </div>
    </section>
  );
}

function TeamBadge({ name, flag, align = "left" }: { name: string; flag?: string | null; align?: "left" | "right" }) {
  return (
    <div className={`grid gap-1 ${align === "right" ? "justify-items-end text-right" : "justify-items-start text-left"}`}>
      <div className="grid h-12 w-16 place-items-center overflow-hidden border-2 border-white bg-[#c0c0c0] shadow-[2px_2px_0_rgba(0,0,0,.35)]">
        {flag ? <img src={flag} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-black text-black">{teamCode(name)}</span>}
      </div>
      <div className="max-w-[120px] text-xl font-black uppercase leading-5 [text-shadow:2px_2px_0_#003b16]">{name}</div>
    </div>
  );
}

function FeaturedStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="win95-panel-inset min-w-0 bg-[#efefdf] p-2">
      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-[var(--muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black">{value}</div>
    </div>
  );
}

function MarketFilters({
  filter,
  query,
  setFilter,
  setQuery
}: {
  filter: "trending" | "live" | "open";
  query: string;
  setFilter: (filter: "trending" | "live" | "open") => void;
  setQuery: (query: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-1">
        {filterLabels.map((item) => (
          <button
            className={`win95-button min-w-0 px-1 text-[11px] ${filter === item.value ? "win95-button-primary" : ""}`}
            key={item.value}
            onClick={() => setFilter(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="win95-label">
        <span>Find match</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#404040]" />
          <input
            aria-label="Search markets"
            className="win95-input pl-8"
            placeholder="Team name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
      </label>
    </div>
  );
}

function MarketRow({ fixture }: { fixture: FixtureItem }) {
  const openBet = useAppStore((state) => state.openBet);
  const matchWinner = fixture.matchWinnerMarket ?? null;
  const odds = fixture.primaryOdds ?? null;
  const options = odds?.PriceNames?.length
    ? odds.PriceNames.map((name) => labelPriceName(name, fixture))
    : matchWinner?.account?.options?.length
      ? matchWinner.account.options
      : [fixture.participant1, "Draw", fixture.participant2];
  const pool = displayPoolLamports(matchWinner?.account);
  const traderCount = matchWinner?.account?.traderCount ?? 0;
  const title = `${fixture.participant1} vs ${fixture.participant2}`;
  const flag1 = flagUrlForTeam(fixture.participant1, 64);
  const flag2 = flagUrlForTeam(fixture.participant2, 64);
  const statusClass = fixture.isLive ? "market-live" : fixture.phase === "finished" ? "market-closed" : "market-open";

  return (
    <article className="win95-panel-inset bg-[#efefdf] p-2">
      <div className="grid gap-2">
        <Link className="grid grid-cols-[1fr_auto] items-start gap-2 text-black no-underline" href={`/match/${fixture.fixtureId}`}>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1">
              <span className={`px-1.5 py-0.5 text-[10px] font-black uppercase ${statusClass}`}>{formatFixtureTiming(fixture)}</span>
            </div>
            <div className="grid gap-1 text-[15px] font-black leading-5">
              <span className="flex min-w-0 items-center gap-1.5">
                {flag1 && <img src={flag1} alt="" className="h-4 w-6 border border-[#808080] object-cover" />}
                <span className="truncate">{fixture.participant1}</span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                {flag2 && <img src={flag2} alt="" className="h-4 w-6 border border-[#808080] object-cover" />}
                <span className="truncate">{fixture.participant2}</span>
              </span>
            </div>
          </div>
          <div className="text-right text-[11px] font-black">
            <div>{formatSol(pool)}</div>
            <div className="mt-1 text-[var(--muted)]">{traderCount} refs</div>
          </div>
        </Link>

        <div className="grid grid-cols-3 gap-1">
          {options.slice(0, 3).map((option, index) => (
            <button
              key={`${fixture.fixtureId}-${option}-${index}`}
              className="win95-button min-w-0 px-1 py-1"
              onClick={() =>
                openBet({
                  fixtureId: String(fixture.fixtureId),
                  title,
                  marketType: 0,
                  outcomeIndex: index,
                  outcomeLabel: option,
                  marketExists: Boolean(matchWinner?.exists),
                  oddsPrice: odds?.Prices?.[index],
                  oddsMessageId: odds?.MessageId,
                  oddsTs: odds?.Ts
                })
              }
              type="button"
            >
              <span className="grid min-w-0 leading-tight">
                <span className="truncate text-[10px] uppercase">{outcomeCode(option, index)}</span>
                <span className="text-sm text-[#000080]">{odds ? formatDecimalOdds(odds.Prices[index]) : "--"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function MarketsUtilityRail({ fixtures }: { fixtures: FixtureItem[] }) {
  const liveCount = fixtures.filter((fixture) => fixture.isLive || fixture.phase === "break").length;
  const openCount = fixtures.filter((fixture) => fixture.timing?.bettingOpen || fixture.timing?.bettingProminent).length;
  const scorers = ["SolStriker", "CryptoKeeper", "GoalGetter", "ChainRef"];

  return (
    <div className="grid gap-3">
      <ComingSoonOverlay>
        <section className="win95-window">
        <div className="win95-titlebar">
          <span>REFEREE_BOX.EXE</span>
        </div>
        <div className="win95-window-body grid gap-2">
          <div className="win95-panel-inset bg-[#efefdf] p-3">
            <h2 className="flex items-center gap-2 text-lg font-black uppercase">
              <ShieldCheck className="h-5 w-5" />
              Be the Ref
            </h2>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--muted)]">
              Draft match terms, set outcomes, and preview the ticket before the whistle.
            </p>
          </div>
          <Link className="win95-button win95-button-primary w-full" href="/create">
            Create Prediction
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Live" value={String(liveCount)} />
            <MiniStat label="Open" value={String(openCount)} />
          </div>
        </div>
        </section>
      </ComingSoonOverlay>

      <ComingSoonOverlay>
        <section className="win95-window">
        <div className="win95-titlebar">
          <span>SCOREBOARD.EXE</span>
        </div>
        <div className="win95-window-body grid gap-1">
          {scorers.map((name, index) => (
            <Link className="grid grid-cols-[28px_1fr_auto] items-center gap-2 p-1 text-black no-underline hover:bg-[#000080] hover:text-white" href="/leaderboard" key={name}>
              <span className="font-black">#{index + 1}</span>
              <span className="truncate font-black">{name}</span>
              <span className="text-xs font-black">+{(128 - index * 19).toFixed(1)}</span>
            </Link>
          ))}
          <Link className="win95-button mt-2 w-full" href="/leaderboard">
            View Leaderboard
          </Link>
        </div>
        </section>
      </ComingSoonOverlay>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="win95-panel-inset bg-white p-2 text-center">
      <div className="text-xl font-black text-[#000080]">{value}</div>
      <div className="text-[10px] font-black uppercase text-[var(--muted)]">{label}</div>
    </div>
  );
}

function formatDecimalOdds(price?: number) {
  if (!price || price <= 0) return "--";
  return (price / 1000).toFixed(2);
}

function displayPoolLamports(
  account:
    | {
        totalStaked?: string;
        liquidityDeposited?: string;
        liquidityWithdrawn?: string;
      }
    | null
    | undefined
) {
  const totalStaked = BigInt(account?.totalStaked ?? "0");
  const deposited = BigInt(account?.liquidityDeposited ?? "0");
  const withdrawn = BigInt(account?.liquidityWithdrawn ?? "0");
  const liquidity = deposited > withdrawn ? deposited - withdrawn : 0n;
  return totalStaked + liquidity;
}

function formatShortCountdown(startTime: number) {
  const ms = Number(startTime) - Date.now();
  if (ms <= 0) return "Starting";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatFixtureTiming(fixture: FixtureItem) {
  if (fixture.isLive) return fixture.status?.name ?? "Live";
  if (fixture.phase === "break") return fixture.status?.name ?? "Break";
  if (fixture.phase === "finished") return "Full Time";
  return fixture.startTime ? formatShortCountdown(fixture.startTime) : "Soon";
}

function labelPriceName(name: string, fixture: FixtureItem) {
  if (name === "part1") return fixture.participant1;
  if (name === "part2") return fixture.participant2;
  if (name === "draw") return "Draw";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function outcomeCode(option: string, index: number) {
  if (index === 1 || option.toLowerCase() === "draw") return "DRAW";
  return teamCode(option) || (index === 0 ? "P1" : "P2");
}

function teamCode(name: string) {
  const words = name.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}
