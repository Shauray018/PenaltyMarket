import {
  BN,
  autoOutcomeFor,
  createProvider,
  getMarketType,
  marketPdaFor,
  optionsFor,
  parseMarketTypes,
  scoreSummary,
  txlineFetch
} from "./lib.mjs";

const [fixtureArg, outcomeArg = "auto", marketTypesArg] = process.argv.slice(2);
if (!fixtureArg || !/^\d+$/.test(fixtureArg)) {
  console.error("Usage: npm run amm:settle-demo -- <fixtureId> [auto|winningOutcome|type:outcome,...] [marketTypes]");
  console.error("Examples:");
  console.error("  npm run amm:settle-demo -- 18218149 auto 0,1,2,3,4");
  console.error("  npm run amm:settle-demo -- 18218149 0 0");
  console.error("  npm run amm:settle-demo -- 18218149 0:0,1:0,2:1,3:1,4:0,5:0");
  process.exit(1);
}

const { connection, program } = createProvider();
const marketTypes = parseMarketTypes(marketTypesArg ?? process.env.AMM_MARKET_TYPES, "0");
const outcomeMap = parseOutcomeMap(outcomeArg);
let summary = null;

if (outcomeArg === "auto") {
  const scoreEvents = await txlineFetch(`/api/scores/snapshot/${fixtureArg}`);
  summary = scoreSummary(scoreEvents);
  console.log(`Auto settlement score: ${summary.p1Goals}-${summary.p2Goals}, corners=${summary.p1Corners + summary.p2Corners}, cards=${summary.p1Cards + summary.p2Cards}`);
}

for (const marketTypeIndex of marketTypes) {
  const marketType = getMarketType(marketTypeIndex);
  const [market] = marketPdaFor(fixtureArg, marketTypeIndex);
  const existing = await connection.getAccountInfo(market);
  if (!existing) {
    console.log(`Skipping missing market type=${marketType.name} market=${market.toBase58()}`);
    continue;
  }

  const account = await program.account.ammMarket.fetch(market);
  if ("resolved" in account.status) {
    console.log(`Already resolved type=${marketType.name} market=${market.toBase58()}`);
    continue;
  }

  let winningOutcome = outcomeMap.get(marketTypeIndex);
  if (winningOutcome === undefined && outcomeMap.has(-1)) winningOutcome = outcomeMap.get(-1);
  if (winningOutcome === undefined && summary) winningOutcome = autoOutcomeFor(marketTypeIndex, summary);
  if (winningOutcome === null || winningOutcome === undefined) {
    console.log(`Skipping ${marketType.name}: no automatic winner for this market type.`);
    continue;
  }

  const fixture = {
    fixtureId: Number(fixtureArg),
    participant1: account.options?.[0] ?? "Team 1",
    participant2: account.options?.[2] ?? account.options?.[1] ?? "Team 2"
  };
  const options = optionsFor(fixture, marketTypeIndex);
  console.log(`Resolving ${marketType.name}: winning_outcome=${winningOutcome} (${options[winningOutcome] ?? "unknown"})`);
  const tx = await program.methods
    .resolveMarket(winningOutcome)
    .accounts({
      market,
      authority: program.provider.publicKey
    })
    .rpc();
  console.log(`  resolved tx=${tx}`);
}

function parseOutcomeMap(value) {
  const map = new Map();
  if (value === "auto") return map;
  if (/^\d+$/.test(value)) {
    map.set(-1, Number(value));
    return map;
  }

  for (const part of value.split(",")) {
    const [type, outcome] = part.split(":").map((item) => Number(item.trim()));
    if (!Number.isInteger(type) || !Number.isInteger(outcome)) {
      throw new Error(`Invalid outcome mapping: ${part}`);
    }
    map.set(type, outcome);
  }
  return map;
}
