import {
  BN,
  createProvider,
  getMarketType,
  lamports,
  lamportsToSol,
  marketPdaFor,
  parseMarketTypes,
  vaultPdaFor
} from "./lib.mjs";

const [fixtureArg, marketTypesArg, amountArg = "max"] = process.argv.slice(2);
if (!fixtureArg || !/^\d+$/.test(fixtureArg)) {
  console.error("Usage: npm run amm:withdraw -- <fixtureId> [marketTypes] [amountSol|max]");
  console.error("Examples:");
  console.error("  npm run amm:withdraw -- 18218149 0 max");
  console.error("  npm run amm:withdraw -- 18218149 0,1,2,3,4,5 max");
  process.exit(1);
}

const marketTypes = parseMarketTypes(marketTypesArg ?? process.env.AMM_MARKET_TYPES, "0");
const { connection, payer, program } = createProvider();

for (const marketTypeIndex of marketTypes) {
  const marketType = getMarketType(marketTypeIndex);
  const [market] = marketPdaFor(fixtureArg, marketTypeIndex);
  const [vault] = vaultPdaFor(market);
  const existing = await connection.getAccountInfo(market);
  if (!existing) {
    console.log(`Skipping missing ${marketType.name}: ${market.toBase58()}`);
    continue;
  }

  const account = await program.account.ammMarket.fetch(market);
  if (!account.authority.equals(payer.publicKey)) {
    console.log(`Skipping ${marketType.name}: keeper is not authority.`);
    continue;
  }

  const available = availableLiquidity(account);
  const amount = amountArg === "max" || amountArg === "all" ? available : lamports(amountArg);
  if (amount.lten(0)) {
    console.log(`${marketType.name}: no withdrawable liquidity.`);
    continue;
  }
  if (amount.gt(available)) {
    console.log(`${marketType.name}: requested ${lamportsToSol(amount)} SOL but only ${lamportsToSol(available)} SOL is withdrawable.`);
    continue;
  }

  console.log(`Withdrawing ${lamportsToSol(amount)} SOL from ${marketType.name}`);
  console.log(`  market=${market.toBase58()}`);
  console.log(`  vault=${vault.toBase58()}`);
  const tx = await program.methods
    .withdrawLiquidity(amount)
    .accounts({
      market,
      vault,
      authority: payer.publicKey
    })
    .rpc();
  console.log(`  withdrawn tx=${tx}`);
}

function availableLiquidity(account) {
  const liquidityDeposited = new BN(account.liquidityDeposited.toString());
  const traderCollateral = new BN(account.traderCollateral.toString());
  const liquidityWithdrawn = new BN(account.liquidityWithdrawn.toString());
  const claimsPaid = new BN(account.claimsPaid.toString());
  const maxLiability = account.outcomeShares.reduce((max, value) => BN.max(max, new BN(value.toString())), new BN(0));
  const collateral = liquidityDeposited.add(traderCollateral).sub(liquidityWithdrawn).sub(claimsPaid);
  const available = collateral.sub(maxLiability);
  return available.gt(new BN(0)) ? available : new BN(0);
}
