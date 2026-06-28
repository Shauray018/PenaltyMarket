import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { connection, marketPda, positionPda, program, txoracleDevnetProgramId, vaultPda } from "@/lib/solana";

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
    const oddsProof = body.oddsProof;
    const dailyOddsMerkleRoots = new PublicKey(String(body.dailyOddsMerkleRoots));
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

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = user;
    tx.recentBlockhash = blockhash;

    return NextResponse.json({
      transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"),
      position: position.toBase58(),
      positionId: positionId.toString(),
      lastValidBlockHeight
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to build bet transaction." }, { status: 400 });
  }
}
