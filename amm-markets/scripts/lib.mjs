import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import BN from "bn.js";

export { BN };

export const AMM_PROGRAM_ID = new PublicKey(
  process.env.AMM_PROGRAM_ID ?? "EbdvTA5GAHZru1f2pwAnu2mPgaWuZQBXXKz16VUiJXvM"
);
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const AMM_ROOT = resolve(REPO_ROOT, "amm-markets");
export const MARKET_TYPES = [
  { index: 0, enumValue: { matchWinner: {} }, name: "MatchWinner" },
  { index: 1, enumValue: { totalGoals: {} }, name: "TotalGoals" },
  { index: 2, enumValue: { totalCorners: {} }, name: "TotalCorners" },
  { index: 3, enumValue: { totalYellowCards: {} }, name: "TotalYellowCards" },
  { index: 4, enumValue: { bothTeamsScore: {} }, name: "BothTeamsScore" },
  { index: 5, enumValue: { firstYellowCard: {} }, name: "FirstYellowCard" }
];

loadDotEnv(resolve(REPO_ROOT, ".env"));

export function createProvider() {
  const rpc = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const secretKeyPath = expandHome(process.env.SOLANA_KEYPAIR ?? "~/.config/solana/id.json");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(secretKeyPath, "utf8"))));
  const connection = new Connection(rpc, "confirmed");
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idlPath = resolve(AMM_ROOT, "target/idl/penalty_amm_markets.json");
  if (!existsSync(idlPath)) {
    throw new Error("AMM IDL missing. Run `npm run amm:build` first.");
  }
  const idl = JSON.parse(readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl, provider);

  return { anchor, BN, connection, payer, provider, program, SystemProgram };
}

export function marketPdaFor(fixtureId, marketTypeIndex) {
  const fixture = new BN(String(fixtureId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("amm-market"), fixture.toArrayLike(Buffer, "le", 8), Buffer.from([marketTypeIndex])],
    AMM_PROGRAM_ID
  );
}

export function vaultPdaFor(marketPda) {
  return PublicKey.findProgramAddressSync([Buffer.from("amm-vault"), marketPda.toBuffer()], AMM_PROGRAM_ID);
}

export function positionPdaFor(marketPda, user, positionId) {
  const position = new BN(String(positionId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("amm-position"), marketPda.toBuffer(), user.toBuffer(), position.toArrayLike(Buffer, "le", 8)],
    AMM_PROGRAM_ID
  );
}

export function optionsFor(fixture, marketTypeIndex) {
  if (marketTypeIndex === 0) return [fixture.participant1, "Draw", fixture.participant2];
  if (marketTypeIndex === 1) return ["Over 2.5 Goals", "Under 2.5 Goals"];
  if (marketTypeIndex === 2) return ["Over 8.5 Corners", "Under 8.5 Corners"];
  if (marketTypeIndex === 3) return ["Over 3.5 Cards", "Under 3.5 Cards"];
  if (marketTypeIndex === 4) return ["Yes", "No"];
  if (marketTypeIndex === 5) return [fixture.participant1, fixture.participant2, "None"];
  throw new Error(`Unsupported market type ${marketTypeIndex}`);
}

export function probabilitiesFor(marketTypeIndex, oddsRecord) {
  const fallback = {
    0: [3334, 3333, 3333],
    1: [5000, 5000],
    2: [5000, 5000],
    3: [5000, 5000],
    4: [5000, 5000],
    5: [4500, 4500, 1000]
  }[marketTypeIndex];

  if (!oddsRecord?.Pct?.length) return fallback;
  const bps = oddsRecord.Pct.map((value) => Math.round(Number(value) * 100));
  if (bps.some((value) => !Number.isFinite(value) || value <= 0)) return fallback;
  return bps;
}

export function pickOddsForMarket(odds, marketTypeIndex) {
  if (!Array.isArray(odds)) return null;

  if (marketTypeIndex === 0) {
    return (
      odds.find(isFullTime1x2) ??
      odds.find((record) => is1x2(record)) ??
      null
    );
  }

  if (marketTypeIndex === 1) {
    return (
      odds.find((record) => isOverUnder(record, "GOALS") && record.MarketParameters === "line=2.5" && !record.MarketPeriod) ??
      odds.find((record) => isOverUnder(record, "GOALS") && !record.MarketPeriod) ??
      null
    );
  }

  if (marketTypeIndex === 2) {
    return (
      odds.find((record) => isOverUnder(record, "CORNERS") && !record.MarketPeriod) ??
      null
    );
  }

  if (marketTypeIndex === 3) {
    return (
      odds.find((record) => isOverUnder(record, "CARDS") && !record.MarketPeriod) ??
      null
    );
  }

  return null;
}

export async function txlineFetch(path) {
  const baseUrl = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";
  if (!process.env.TXLINE_JWT || !process.env.TXLINE_API_TOKEN) {
    throw new Error("Missing TXLINE_JWT or TXLINE_API_TOKEN.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.TXLINE_JWT}`,
      "X-Api-Token": process.env.TXLINE_API_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`TxLINE ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function normalizeFixture(fixture) {
  const fixtureId = fixture.fixtureId ?? fixture.FixtureId;
  const participant1 = fixture.participant1 ?? fixture.Participant1 ?? `Team ${fixture.Participant1Id ?? 1}`;
  const participant2 = fixture.participant2 ?? fixture.Participant2 ?? `Team ${fixture.Participant2Id ?? 2}`;
  const startTime = fixture.startTime ?? fixture.StartTime;
  const gameState = fixture.gameState ?? fixture.GameState ?? "unknown";

  return { ...fixture, fixtureId, participant1, participant2, startTime, gameState };
}

export function parseMarketTypes(value, defaultValue = "0") {
  return String(value ?? defaultValue)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 5);
}

export function getMarketType(index) {
  const marketType = MARKET_TYPES.find((item) => item.index === index);
  if (!marketType) throw new Error(`Unsupported market type ${index}`);
  return marketType;
}

export function lamports(sol) {
  return new BN(Math.round(Number(sol) * LAMPORTS_PER_SOL).toString());
}

export function lamportsToSol(value) {
  return (Number(value.toString()) / LAMPORTS_PER_SOL).toLocaleString("en-US", {
    maximumFractionDigits: 9
  });
}

export function scoreSummary(scoreEvents) {
  const latest = Array.isArray(scoreEvents)
    ? [...scoreEvents]
        .filter((event) => event.Score || event.StatusId || event.Clock)
        .sort((a, b) => Number(b.Ts ?? 0) - Number(a.Ts ?? 0))[0]
    : null;
  const score = latest?.Score ?? {};
  const p1 = score.Participant1?.Total ?? {};
  const p2 = score.Participant2?.Total ?? {};
  return {
    latest,
    p1Goals: Number(p1.Goals ?? 0),
    p2Goals: Number(p2.Goals ?? 0),
    p1Corners: Number(p1.Corners ?? 0),
    p2Corners: Number(p2.Corners ?? 0),
    p1Cards: Number(p1.YellowCards ?? 0) + Number(p1.RedCards ?? 0),
    p2Cards: Number(p2.YellowCards ?? 0) + Number(p2.RedCards ?? 0)
  };
}

export function autoOutcomeFor(marketTypeIndex, summary) {
  if (marketTypeIndex === 0) {
    if (summary.p1Goals > summary.p2Goals) return 0;
    if (summary.p1Goals < summary.p2Goals) return 2;
    return 1;
  }
  if (marketTypeIndex === 1) return summary.p1Goals + summary.p2Goals > 2.5 ? 0 : 1;
  if (marketTypeIndex === 2) return summary.p1Corners + summary.p2Corners > 8.5 ? 0 : 1;
  if (marketTypeIndex === 3) return summary.p1Cards + summary.p2Cards > 3.5 ? 0 : 1;
  if (marketTypeIndex === 4) return summary.p1Goals > 0 && summary.p2Goals > 0 ? 0 : 1;
  return null;
}

function isFullTime1x2(record) {
  return is1x2(record) && !record.MarketPeriod;
}

function is1x2(record) {
  const names = (record.PriceNames ?? []).join(" ").toLowerCase();
  return record.SuperOddsType === "1X2_PARTICIPANT_RESULT" && names.includes("part1") && names.includes("draw") && names.includes("part2");
}

function isOverUnder(record, key) {
  const names = (record.PriceNames ?? []).join(" ").toLowerCase();
  return String(record.SuperOddsType ?? "").includes(`OVERUNDER_PARTICIPANT_${key}`) && names.includes("over") && names.includes("under");
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
  }
}

function expandHome(path) {
  return path.startsWith("~") ? path.replace("~", homedir()) : path;
}
