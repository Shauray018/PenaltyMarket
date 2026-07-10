export const MARKET_INITIALIZE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MARKET_PROMINENT_WINDOW_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_MATCH_BETTING_DURATION_MS = 4 * 60 * 60 * 1000;

const configuredDurationSeconds = Number(
  process.env.NEXT_PUBLIC_MATCH_BETTING_DURATION_SECONDS ?? process.env.MATCH_BETTING_DURATION_SECONDS ?? 0
);

export const MATCH_BETTING_DURATION_MS =
  Number.isFinite(configuredDurationSeconds) && configuredDurationSeconds > 0
    ? configuredDurationSeconds * 1000
    : DEFAULT_MATCH_BETTING_DURATION_MS;

export function marketTiming(startTime?: number, now = Date.now(), onChainCloseTimeMs?: number) {
  const kickoff = Number(startTime ?? 0);
  const msUntilStart = kickoff - now;
  const fallbackCloseTimeMs = kickoff + MATCH_BETTING_DURATION_MS;
  const closeTimeMs =
    onChainCloseTimeMs && Number.isFinite(onChainCloseTimeMs) && onChainCloseTimeMs > 0
      ? onChainCloseTimeMs
      : fallbackCloseTimeMs;

  return {
    msUntilStart,
    closeTimeMs,
    closeTimeSeconds: Math.floor(closeTimeMs / 1000),
    initializeEligible: msUntilStart <= MARKET_INITIALIZE_WINDOW_MS && now < closeTimeMs,
    bettingProminent: (msUntilStart <= MARKET_PROMINENT_WINDOW_MS || now >= kickoff) && now < closeTimeMs,
    bettingOpen: now < closeTimeMs,
    bettingClosed: now >= closeTimeMs
  };
}
