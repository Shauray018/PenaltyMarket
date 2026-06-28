"use client";

import { create } from "zustand";

export type FixtureItem = {
  fixtureId: number;
  participant1: string;
  participant2: string;
  startTime?: number;
  phase?: string;
  statusId?: number | null;
  status?: {
    name: string;
    label: string;
    phase: string;
    live: boolean;
    terminal: boolean;
  } | null;
  isLive?: boolean;
  isFinished?: boolean;
  timing?: {
    initializeEligible: boolean;
    bettingProminent: boolean;
    bettingOpen: boolean;
    bettingClosed: boolean;
    msUntilStart: number;
  };
};

export type MarketItem = {
  publicKey: string;
  marketType: { index: number; label: string; options: readonly string[] };
  exists: boolean;
  account: null | {
    options?: string[];
    outcomeStakes?: string[];
    outcomeLiabilities?: string[];
    totalStaked?: string;
    totalReservedLiability?: string;
    liquidityDeposited?: string;
    liquidityWithdrawn?: string;
    status?: Record<string, unknown>;
    closeTime?: string;
  };
};

export type OddsRecord = {
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

type AppState = {
  fixtures: FixtureItem[];
  marketsByFixture: Record<string, MarketItem[]>;
  oddsByFixture: Record<string, OddsRecord | null>;
  selectedBet: null | {
    fixtureId: string;
    title: string;
    marketType: number;
    outcomeIndex: number;
    outcomeLabel: string;
    marketExists: boolean;
    oddsPrice?: number;
    oddsMessageId?: string;
    oddsTs?: number;
  };
  fixturesLoadedAt: number;
  loadingFixtures: boolean;
  query: string;
  filter: "trending" | "live" | "open";
  setQuery: (query: string) => void;
  setFilter: (filter: AppState["filter"]) => void;
  openBet: (bet: NonNullable<AppState["selectedBet"]>) => void;
  closeBet: () => void;
  loadFixtures: (force?: boolean) => Promise<void>;
  loadMarkets: (fixtureId: string, force?: boolean) => Promise<MarketItem[]>;
  loadOdds: (fixtureId: string, force?: boolean) => Promise<OddsRecord | null>;
  setOdds: (fixtureId: string, odds: OddsRecord | null) => void;
};

const CACHE_MS = 20_000;

export const useAppStore = create<AppState>((set, get) => ({
  fixtures: [],
  marketsByFixture: {},
  oddsByFixture: {},
  selectedBet: null,
  fixturesLoadedAt: 0,
  loadingFixtures: false,
  query: "",
  filter: "trending",
  setQuery: (query) => set({ query }),
  setFilter: (filter) => set({ filter }),
  openBet: (selectedBet) => set({ selectedBet }),
  closeBet: () => set({ selectedBet: null }),
  loadFixtures: async (force = false) => {
    const state = get();
    if (!force && state.fixtures.length && Date.now() - state.fixturesLoadedAt < CACHE_MS) return;

    set({ loadingFixtures: true });
    try {
      const response = await fetch("/api/fixtures");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load fixtures.");
      set({ fixtures: payload.fixtures ?? [], fixturesLoadedAt: Date.now() });
    } finally {
      set({ loadingFixtures: false });
    }
  },
  loadMarkets: async (fixtureId, force = false) => {
    const existing = get().marketsByFixture[fixtureId];
    if (!force && existing) return existing;

    const response = await fetch(`/api/markets/${fixtureId}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load markets.");

    const markets = payload.markets ?? [];
    set((state) => ({
      marketsByFixture: {
        ...state.marketsByFixture,
        [fixtureId]: markets
      }
    }));
    return markets;
  },
  loadOdds: async (fixtureId, force = false) => {
    const existing = get().oddsByFixture[fixtureId];
    if (!force && existing !== undefined) return existing;

    const response = await fetch(`/api/odds/${fixtureId}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load odds.");
    const odds = payload.primary ?? null;
    set((state) => ({
      oddsByFixture: {
        ...state.oddsByFixture,
        [fixtureId]: odds
      }
    }));
    return odds;
  },
  setOdds: (fixtureId, odds) =>
    set((state) => ({
      oddsByFixture: {
        ...state.oddsByFixture,
        [fixtureId]: odds
      }
    }))
}));
