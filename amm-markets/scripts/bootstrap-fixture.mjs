import {
  BN,
  createProvider,
  getMarketType,
  lamports,
  marketPdaFor,
  normalizeFixture,
  optionsFor,
  parseMarketTypes,
  pickOddsForMarket,
  probabilitiesFor,
  txlineFetch,
  vaultPdaFor
} from "./lib.mjs";

const [fixtureArg, liquidityArg, marketTypesArg] = process.argv.slice(2);
if (!fixtureArg || !/^\d+$/.test(fixtureArg)) {
  console.error("Usage: npm run amm:bootstrap -- <fixtureId> [liquiditySol] [marketTypes]");
  console.error("Examples:");
  console.error("  npm run amm:bootstrap -- 18237038 1 0");
  console.error("  npm run amm:demo-fixture -- 18237038");
  process.exit(1);
}

const liquiditySol = Number(liquidityArg ?? process.env.AMM_INITIAL_LIQUIDITY_SOL ?? "1");
const marketTypes = parseMarketTypes(marketTypesArg ?? process.env.AMM_MARKET_TYPES, "0");
const bettingDurationSeconds = Number(process.env.MATCH_BETTING_DURATION_SECONDS ?? process.env.AMM_BETTING_DURATION_SECONDS ?? 4 * 60 * 60);
const feeBps = Number(process.env.AMM_FEE_BPS ?? "100");
const virtualLiquiditySol = Number(process.env.AMM_VIRTUAL_LIQUIDITY_SOL ?? liquiditySol);
const topUpExisting = process.env.AMM_TOP_UP_EXISTING === "1";

if (!Number.isFinite(liquiditySol) || liquiditySol <= 0) {
  console.error("liquiditySol must be a positive number.");
  process.exit(1);
}
if (!Number.isFinite(virtualLiquiditySol) || virtualLiquiditySol <= 0) {
  console.error("AMM_VIRTUAL_LIQUIDITY_SOL must be a positive number.");
  process.exit(1);
}
if (!marketTypes.length) {
  console.error("No AMM market types selected.");
  process.exit(1);
}

const { connection, payer, program, SystemProgram } = createProvider();
const fixtures = await txlineFetch("/api/fixtures/snapshot");
const fixture = fixtures.map(normalizeFixture).find((item) => String(item.fixtureId) === fixtureArg);
if (!fixture) {
  console.error(`Fixture not found in TxLINE snapshot: ${fixtureArg}`);
  process.exit(1);
}

const odds = await txlineFetch(`/api/odds/updates/${fixtureArg}`).catch(async () => txlineFetch(`/api/odds/snapshot/${fixtureArg}`));
const closeTime = new BN(Math.floor(Number(fixture.startTime) / 1000) + bettingDurationSeconds);
const liquidityLamports = lamports(liquiditySol);
const liquidityParameter = lamports(virtualLiquiditySol);

console.log(`Bootstrapping AMM fixture=${fixtureArg} ${fixture.participant1} vs ${fixture.participant2}`);
console.log(`  liquidity=${liquiditySol} SOL per market`);
console.log(`  virtual_liquidity=${virtualLiquiditySol} SOL`);
console.log(`  close_time=${closeTime.toString()}`);
console.log(`  fee_bps=${feeBps}`);

for (const marketTypeIndex of marketTypes) {
  const marketType = getMarketType(marketTypeIndex);
  const [market] = marketPdaFor(fixture.fixtureId, marketTypeIndex);
  const [vault] = vaultPdaFor(market);
  const existing = await connection.getAccountInfo(market);
  const marketOdds = pickOddsForMarket(odds, marketTypeIndex);
  const options = optionsFor(fixture, marketTypeIndex);
  const probabilities = probabilitiesFor(marketTypeIndex, marketOdds);

  console.log(`\n${marketType.name}`);
  console.log(`  market=${market.toBase58()}`);
  console.log(`  vault=${vault.toBase58()}`);
  console.log(`  options=${options.join(", ")}`);
  console.log(`  probabilities_bps=${probabilities.join(", ")}`);
  if (marketOdds) {
    console.log(`  txline_odds=${marketOdds.MessageId} ${marketOdds.SuperOddsType} ${marketOdds.MarketParameters ?? "full"} ${marketOdds.MarketPeriod ?? "full"}`);
  } else {
    console.log("  txline_odds=fallback probabilities");
  }

  if (!existing) {
    const tx = await program.methods
      .initializeMarket(
        new BN(String(fixture.fixtureId)),
        marketType.enumValue,
        options,
        closeTime,
        probabilities,
        liquidityParameter,
        feeBps
      )
      .accounts({
        market,
        vault,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc();
    console.log(`  initialized tx=${tx}`);
  } else {
    console.log("  market already exists");
    if (!topUpExisting) {
      console.log("  skipped funding existing market (set AMM_TOP_UP_EXISTING=1 to top up)");
      continue;
    }
  }

  const fundTx = await program.methods
    .depositLiquidity(liquidityLamports)
    .accounts({
      market,
      vault,
      funder: payer.publicKey,
      systemProgram: SystemProgram.programId
    })
    .rpc();
  console.log(`  funded tx=${fundTx}`);
}
