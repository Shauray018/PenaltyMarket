export const MARKET_INITIALIZE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MARKET_PROMINENT_WINDOW_MS = 6 * 60 * 60 * 1000;
export const MARKET_CLOSE_BUFFER_MS = 5 * 60 * 1000;

export function marketTiming(startTime?: number, now = Date.now()) {
  const kickoff = Number(startTime ?? 0);
  const msUntilStart = kickoff - now;
  const closeTimeMs = kickoff - MARKET_CLOSE_BUFFER_MS;

  return {
    msUntilStart,
    closeTimeMs,
    closeTimeSeconds: Math.floor(closeTimeMs / 1000),
    initializeEligible: msUntilStart <= MARKET_INITIALIZE_WINDOW_MS && now < closeTimeMs,
    bettingProminent: msUntilStart <= MARKET_PROMINENT_WINDOW_MS && now < closeTimeMs,
    bettingOpen: now < closeTimeMs,
    bettingClosed: now >= closeTimeMs
  };
}
