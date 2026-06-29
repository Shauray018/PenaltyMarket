import * as anchor from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { connection, fetchMarketAccount, marketPda, positionPda, program, txoracleDevnetProgramId, vaultPda } from "@/lib/solana";

export const runtime = "nodejs";

function toLamports(body: Record<string, unknown>) {
  if (body.stakeLamports !== undefined) return new anchor.BN(String(body.stakeLamports));
  if (body.amountLamports !== undefined) return new anchor.BN(String(body.amountLamports));
  const sol = Number(body.stakeSol ?? body.amount ?? 0);
  return new anchor.BN(Math.round(sol * LAMPORTS_PER_SOL).toString());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const user = new PublicKey(String(body.user));
    const fixtureId = BigInt(String(body.fixtureId));
    const marketType = Number(body.marketType ?? 0);
    const outcomeIndex = Number(body.outcomeIndex);
    const stakeLamports = toLamports(body);
    const oddsPrice = Number(body.oddsPrice);
    const oddsProof = normalizeOddsProof(body.oddsProof);
    const dailyOddsMerkleRoots = body.dailyOddsMerkleRoots
      ? new PublicKey(String(body.dailyOddsMerkleRoots))
      : txoracleDevnetProgramId;
    const positionId = BigInt(String(body.positionId ?? Date.now()));

    if (!Number.isInteger(marketType) || !Number.isInteger(outcomeIndex) || stakeLamports.lten(0)) {
      return NextResponse.json({ error: "Invalid bet request." }, { status: 400 });
    }

    if (!Number.isInteger(oddsPrice) || oddsPrice <= 0 || !oddsProof) {
      return NextResponse.json(
        { error: "Missing oddsPrice/oddsProof. Fetch /api/odds/proof for the selected odds update before betting." },
        { status: 400 }
      );
    }

    const [market] = marketPda(fixtureId, marketType);
    const [vault] = vaultPda(market);
    const [position] = positionPda(market, user, positionId);

    const marketAccount = await fetchMarketAccount(market);
    if (!marketAccount) {
      return NextResponse.json(
        {
          error: "Market is not initialized.",
          fixtureId: fixtureId.toString(),
          marketType,
          market: market.toBase58(),
          initializeCommand: `npm run keeper:init-fixtures -- ${fixtureId.toString()}`
        },
        { status: 400 }
      );
    }
    const closeTime = Number((marketAccount as { closeTime?: { toString: () => string } | string | number }).closeTime ?? 0);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (closeTime && nowSeconds >= closeTime) {
      return NextResponse.json(
        {
          error: "Betting period has closed.",
          fixtureId: fixtureId.toString(),
          marketType,
          market: market.toBase58(),
          closeTime,
          closeTimeIso: new Date(closeTime * 1000).toISOString(),
          now: nowSeconds,
          nowIso: new Date(nowSeconds * 1000).toISOString()
        },
        { status: 400 }
      );
    }

    const existingPosition = await connection.getAccountInfo(position);
    if (existingPosition) {
      return NextResponse.json({ error: "Position id already exists.", position: position.toBase58() }, { status: 400 });
    }

    const balance = await connection.getBalance(user, "confirmed");
    if (BigInt(balance) < BigInt(stakeLamports.toString())) {
      return NextResponse.json(
        {
          error: "Insufficient devnet SOL.",
          balanceLamports: balance.toString(),
          requiredLamports: stakeLamports.toString()
        },
        { status: 400 }
      );
    }

    const tx = await program.methods
      .buyPosition(new anchor.BN(positionId.toString()), outcomeIndex, stakeLamports, oddsPrice, oddsProof)
      .accounts({
        market,
        vault,
        position,
        user,
        dailyOddsMerkleRoots,
        txoracleProgram: txoracleDevnetProgramId,
        systemProgram: SystemProgram.programId
      })
      .transaction();

    const instructions = [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ...tx.instructions
    ];

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const lookupTableAddress = process.env.BET_LOOKUP_TABLE_ADDRESS;

    if (lookupTableAddress) {
      const lookupTable = await connection.getAddressLookupTable(new PublicKey(lookupTableAddress));
      if (!lookupTable.value) {
        return NextResponse.json({ error: `Address lookup table not found: ${lookupTableAddress}` }, { status: 400 });
      }

      const message = new TransactionMessage({
        payerKey: user,
        recentBlockhash: blockhash,
        instructions
      }).compileToV0Message([lookupTable.value]);
      const versionedTx = new VersionedTransaction(message);

      return NextResponse.json({
        transaction: Buffer.from(versionedTx.serialize()).toString("base64"),
        version: "v0",
        lookupTable: lookupTableAddress,
        position: position.toBase58(),
        positionId: positionId.toString(),
        lastValidBlockHeight
      });
    }

    tx.instructions = instructions;
    tx.feePayer = user;
    tx.recentBlockhash = blockhash;

    return NextResponse.json({
      transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"),
      version: "legacy",
      position: position.toBase58(),
      positionId: positionId.toString(),
      lastValidBlockHeight
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to build bet transaction." }, { status: 400 });
  }
}

function normalizeOddsProof(input: unknown) {
  const proof = (input ?? {}) as Record<string, unknown>;
  const oddsSnapshot = (proof.oddsSnapshot ?? {}) as Record<string, unknown>;
  const summary = (proof.summary ?? {}) as Record<string, unknown>;
  const updateStats = (summary.updateStats ?? {}) as Record<string, unknown>;

  return {
    ts: new anchor.BN(String(proof.ts ?? 0)),
    oddsSnapshot: {
      fixtureId: new anchor.BN(String(oddsSnapshot.fixtureId ?? 0)),
      messageId: String(oddsSnapshot.messageId ?? ""),
      ts: new anchor.BN(String(oddsSnapshot.ts ?? 0)),
      bookmaker: String(oddsSnapshot.bookmaker ?? ""),
      bookmakerId: Number(oddsSnapshot.bookmakerId ?? 0),
      superOddsType: String(oddsSnapshot.superOddsType ?? ""),
      gameState: oddsSnapshot.gameState === null || oddsSnapshot.gameState === undefined ? null : String(oddsSnapshot.gameState),
      inRunning: Boolean(oddsSnapshot.inRunning),
      marketParameters:
        oddsSnapshot.marketParameters === null || oddsSnapshot.marketParameters === undefined
          ? null
          : String(oddsSnapshot.marketParameters),
      marketPeriod:
        oddsSnapshot.marketPeriod === null || oddsSnapshot.marketPeriod === undefined ? null : String(oddsSnapshot.marketPeriod),
      priceNames: Array.isArray(oddsSnapshot.priceNames) ? oddsSnapshot.priceNames.map((value) => String(value)) : [],
      prices: Array.isArray(oddsSnapshot.prices) ? oddsSnapshot.prices.map((value) => Number(value)) : []
    },
    summary: {
      fixtureId: new anchor.BN(String(summary.fixtureId ?? 0)),
      updateStats: {
        updateCount: Number(updateStats.updateCount ?? 0),
        minTimestamp: new anchor.BN(String(updateStats.minTimestamp ?? 0)),
        maxTimestamp: new anchor.BN(String(updateStats.maxTimestamp ?? 0))
      },
      oddsSubTreeRoot: Array.isArray(summary.oddsSubTreeRoot) ? summary.oddsSubTreeRoot.map((value) => Number(value)) : []
    },
    subTreeProof: normalizeProofNodes(proof.subTreeProof),
    mainTreeProof: normalizeProofNodes(proof.mainTreeProof)
  };
}

function normalizeProofNodes(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((node) => {
    const item = (node ?? {}) as Record<string, unknown>;
    return {
      hash: Array.isArray(item.hash) ? item.hash.map((value) => Number(value)) : [],
      isRightSibling: Boolean(item.isRightSibling)
    };
  });
}
