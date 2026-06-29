"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Flame, Search, ShieldCheck, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui";
import { flagUrlForTeam } from "@/lib/flags";
import { formatSol } from "@/lib/format";
import { useAppStore, type FixtureItem } from "@/lib/store";

export function MarketBoard() {
  const fixtures = useAppStore((state) => state.fixtures);
  const loading = useAppStore((state) => state.loadingFixtures);
  const query = useAppStore((state) => state.query);
  const setQuery = useAppStore((state) => state.setQuery);
  const loadFixtures = useAppStore((state) => state.loadFixtures);

  useEffect(() => {
    loadFixtures();
    const interval = window.setInterval(() => loadFixtures(true), 30_000);
    return () => window.clearInterval(interval);
  }, [loadFixtures]);

  const visibleFixtures = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return fixtures.filter((fixture) => {
      if (!normalizedQuery) return true;
      return `${fixture.participant1} ${fixture.participant2} ${fixture.fixtureId}`.toLowerCase().includes(normalizedQuery);
    });
  }, [fixtures, query]);

  const featured =
    visibleFixtures.find((fixture) => fixture.isLive || fixture.phase === "break") ??
    visibleFixtures.find((fixture) => fixture.timing?.bettingProminent) ??
    visibleFixtures[0];

  return (
    <>
      <div className="grid gap-12">
        <FeaturedMarket fixture={featured} />

        <div className="grid gap-12 lg:grid-cols-[1fr_370px]">
          <div className="grid gap-8">
            {/* <FilterBar query={query} setQuery={setQuery} /> */}

            {loading && !visibleFixtures.length ? (
              <div className="soft-panel p-8 text-center text-sm font-bold text-[var(--muted)]">Loading markets</div>
            ) : (
              <div className="grid gap-x-12 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
                {visibleFixtures.slice(0, 9).map((fixture) => (
                  <MarketTile key={fixture.fixtureId} fixture={fixture} />
                ))}
              </div>
            )}

            {!loading && !visibleFixtures.length && (
              <div className="soft-panel p-8 text-center text-sm font-bold text-[var(--muted)]">No markets match the current search.</div>
            )}

            <div className="flex justify-center">
              <button className="h-14 rounded-[18px] border border-[#2b3438] px-14 text-base font-black text-white transition hover:border-[var(--accent)]" type="button">
                Load More Markets
              </button>
            </div>
          </div>

          <MarketsSidebar />
        </div>
      </div>
    </>
  );
}

function FeaturedMarket({ fixture }: { fixture?: FixtureItem }) {
  const title = fixture ? `${fixture.participant1} VS ${fixture.participant2}` : "BRAZIL VS ARGENTINA";
  const [team1, team2] = title.split(" VS ");

  return (
    <section className="pitch-hero overflow-hidden rounded-[26px] border border-[#1e7b3f] px-12 py-8 md:px-14 md:py-9">
      <div className="relative grid min-h-[332px] gap-8 md:grid-cols-[1fr_345px] md:items-center">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/18 px-5 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white/80">
            <Trophy className="h-5 w-5 text-[var(--gold)]" />
            Match of the Week
          </div>
          <h1 className="hero-title mt-7 max-w-2xl uppercase text-white">
            {team1 ?? "Brazil"} <span className="text-[var(--gold)]">VS</span>
            <br />
            {team2 ?? "Argentina"}
          </h1>
          <p className="mt-4 max-w-xl text-xl font-bold leading-7 text-white/70">
            The ultimate rivalry returns. Predict the winner and share in the live SOL prize pool.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-7">
            <Link href={fixture ? `/match/${fixture.fixtureId}` : "/"}>
              <Button className="h-14 rounded-[17px] bg-white px-9 text-lg text-[var(--accent)] hover:bg-white/90">
                View Featured Market
              </Button>
            </Link>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white/45">Current Pool</div>
              <div className="text-3xl font-black text-white">{fixture ? "Live SOL" : "2,500.00 SOL"}</div>
            </div>
          </div>
        </div>
        <div className="hidden md:block">
          <HeroCountdown fixture={fixture} />
        </div>
      </div>
    </section>
  );
}

function HeroCountdown({ fixture }: { fixture?: FixtureItem }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const isLive = Boolean(fixture?.isLive);
  const isBreak = fixture?.phase === "break";
  const ms = Math.max(0, Number(fixture?.startTime ?? now) - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);

  return (
    <div className="rounded-[22px] border border-white/20 bg-black/20 p-8 text-center shadow-2xl backdrop-blur">
      {isLive || isBreak ? (
        <>
          <div className="text-sm font-black uppercase tracking-[0.22em] text-white/65">{isBreak ? "Match at Break" : "Match Live Now"}</div>
          <div className="mt-5 rounded-[18px] bg-[#071d0f] px-8 py-7">
            <div className="text-5xl font-black leading-none text-white">{fixture?.status?.name ?? (isBreak ? "HT" : "LIVE")}</div>
            <div className="mt-3 text-sm font-black uppercase text-[var(--accent)]">{fixture?.status?.label ?? (isBreak ? "Half Time" : "Live")}</div>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-black uppercase tracking-[0.22em] text-white/65">Next Match Starts</div>
          <div className="mt-5 grid grid-cols-4 gap-4">
            {[
              ["days", days],
              ["hours", hours],
              ["mins", mins],
              ["secs", secs]
            ].map(([label, value]) => (
              <div key={label} className="rounded-[16px] bg-[#071d0f] pl-3 pr-14 py-4">
                <div className="text-4xl font-black leading-none text-white">{String(value).padStart(2, "0")}</div>
                <div className="mt-2 text-xs font-black uppercase text-[var(--accent)]">{label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterBar({ query, setQuery }: { query: string; setQuery: (query: string) => void }) {
  return (
    <section className="soft-panel grid gap-4 p-5 xl:grid-cols-[185px_185px_1fr_40px] xl:items-end">
      <label className="grid gap-2">
        <span className="text-xs font-black uppercase text-white/45">Competition</span>
        <select className="h-12 rounded-full border border-[#1c2427] bg-black px-4 text-sm font-bold text-white outline-none">
          <option>All Leagues</option>
          <option>World Cup</option>
          <option>Premier League</option>
        </select>
      </label>
      <label className="grid gap-2">
        <span className="text-xs font-black uppercase text-white/45">Sort By</span>
        <select className="h-12 rounded-full border border-[#1c2427] bg-black px-4 text-sm font-bold text-white outline-none">
          <option>Largest Pool</option>
          <option>Kickoff</option>
          <option>Live</option>
        </select>
      </label>
      <div className="flex items-center justify-end gap-4">
        <span className="text-sm font-black text-white">NFT Holders Only</span>
        <span className="relative h-7 w-12 rounded-full bg-white">
          <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-[#dbe1e5]" />
        </span>
      </div>
      <label className="relative">
        <Search className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
        <input
          aria-label="Search markets"
          className="h-12 w-full rounded-full border border-transparent bg-transparent pl-4 pr-9 text-sm text-white outline-none focus:border-[#263234]"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
    </section>
  );
}

function MarketTile({ fixture }: { fixture: FixtureItem }) {
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

  return (
    <article className="market-tile grid gap-4">
      <div className="flex items-center justify-between text-xs font-black text-white/55">
        <span className="rounded-full border border-[#283033] px-4 py-1.5">{fixture.phase ?? "World Cup"}</span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-4 w-4" />
          {formatFixtureTiming(fixture)}
        </span>
      </div>
      <Link href={`/match/${fixture.fixtureId}`} className="grid gap-1">
        <h2 className="flex items-center gap-2 text-xl font-black leading-tight text-white">
          {flag1 && <img alt="" className="h-6 w-6 rounded-sm object-cover" src={flag1} />}
          {fixture.participant1}
        </h2>
        <div className="text-sm font-black uppercase text-white/55">vs</div>
        <h3 className="flex items-center gap-2 text-xl font-black leading-tight text-white">
          {flag2 && <img alt="" className="h-6 w-6 rounded-sm object-cover" src={flag2} />}
          {fixture.participant2}
        </h3>
      </Link>
      <div className="grid grid-cols-3 gap-3">
        {options.slice(0, 3).map((option, index) => (
          <button
            key={`${fixture.fixtureId}-${option}`}
            className="dark-press-3d h-14 rounded-[14px] bg-[#0b1118] text-center transition hover:bg-[#111c28]"
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
            <div className="text-xs font-black uppercase text-white/45">{outcomeCode(option, index)}</div>
            <div className="mt-1 text-lg font-black text-[var(--accent)]">{odds ? formatDecimalOdds(odds.Prices[index]) : "--"}</div>
          </button>
        ))}
      </div>
      <div className="border-t border-[#20282b] pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase text-white/45">Pool Size</div>
            <div className="text-base font-black text-white">{formatSol(pool)}</div>
          </div>
          <div className="flex items-center text-xs font-bold text-white/65">
            <Users className="mr-1 h-4 w-4 text-[var(--accent)]" />
            {traderCount} traders
          </div>
        </div>
        <button
          className="press-3d mt-5 h-11 w-full rounded-[16px] bg-[var(--accent)] text-base font-black text-[#071008] transition hover:bg-[var(--accent-strong)]"
          onClick={() =>
            openBet({
              fixtureId: String(fixture.fixtureId),
              title,
              marketType: 0,
              outcomeIndex: 0,
              outcomeLabel: options[0] ?? fixture.participant1,
              marketExists: Boolean(matchWinner?.exists),
              oddsPrice: odds?.Prices?.[0],
              oddsMessageId: odds?.MessageId,
              oddsTs: odds?.Ts
            })
          }
          type="button"
        >
          Place Prediction
        </button>
      </div>
    </article>
  );
}

function MarketsSidebar() {
  const scorers = ["SolStriker", "CryptoKeeper", "NftFanatic", "GoalGetter", "BlockchainBlu"];
  return (
    <aside className="grid h-fit gap-10">
      <section className="rounded-[18px] bg-[var(--accent)] p-7 text-[#071008]">
        <h2 className="flex items-center gap-2 text-2xl font-black italic">
          <Trophy className="h-6 w-6" />
          BE THE REF
        </h2>
        <p className="mt-4 text-base font-bold leading-6 text-[#12411f]">
          Have a specific match in mind? Create your own prediction market and earn 1% of the total pool.
        </p>
        <button className="dark-press-3d mt-8 h-14 w-full rounded-[16px] bg-[#15191f] text-base font-black text-white" type="button">
          Create Prediction
        </button>
      </section>

      <section>
        <div className="mb-7 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-black text-white">
            <Trophy className="h-6 w-6 text-[var(--gold)]" />
            Top Scorers
          </h2>
          <button className="text-sm font-black text-[var(--accent)]" type="button">View All</button>
        </div>
        <div className="grid gap-0">
          {scorers.map((name, index) => (
            <div key={name} className="grid grid-cols-[34px_44px_1fr_auto] items-center border-b border-[#22292c] py-5">
              <div className="text-xl font-black text-white">#{index + 1}</div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#e7d8c7] to-[#2261a8] text-xs font-black text-black">
                {name.slice(0, 2)}
              </div>
              <div>
                <div className="font-black text-white">{name}</div>
                <div className="text-xs font-black uppercase text-white/45">Pro Bettor</div>
              </div>
              <div className="text-right">
                <div className="font-black text-[var(--accent)]">+{452 - index * 71}.8 SOL</div>
                <div className="text-xs font-bold text-white/50">Total Payouts</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-5">
        <div className="soft-panel grid h-28 place-items-center text-center">
          <Flame className="h-6 w-6 text-[var(--accent)]" />
          <div className="text-3xl font-black text-white">24.5K</div>
          <div className="text-xs font-black uppercase text-white/50">Bets Placed</div>
        </div>
        <div className="soft-panel grid h-28 place-items-center text-center">
          <ShieldCheck className="h-6 w-6 text-[var(--accent)]" />
          <div className="text-3xl font-black text-white">100%</div>
          <div className="text-xs font-black uppercase text-white/50">Verified</div>
        </div>
      </div>

      <section className="rounded-[18px] bg-[#230858] p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#ff8a00]">
          <Flame className="h-7 w-7" />
        </div>
        <h2 className="mt-7 text-xl font-black text-white">Stadium Updates</h2>
        <p className="mt-3 text-sm font-bold leading-5 text-white/55">Get the best odds and match previews delivered to your inbox.</p>
        <div className="mt-7 grid gap-3">
          <input className="h-11 rounded-full bg-black px-5 text-sm font-bold text-white outline-none" placeholder="strikernft@sol.com" />
          <button className="press-3d h-12 rounded-full bg-[var(--accent)] text-base font-black text-[#071008]" type="button">
            Join Stadium
          </button>
        </div>
      </section>
    </aside>
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
  if (fixture.phase === "finished") return "Finished";
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
  const words = option.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return index === 0 ? "P1" : "P2";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}
