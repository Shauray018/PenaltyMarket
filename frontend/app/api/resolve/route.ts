import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { connection, marketPda, program, txoracleDevnetProgramId } from "@/lib/solana";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const adminToken = process.env.KEEPER_ADMIN_TOKEN;
    if (!adminToken || request.headers.get("authorization") !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const secret = process.env.RESOLVER_KEYPAIR_JSON;
    if (!secret) {
      return NextResponse.json({ error: "Missing RESOLVER_KEYPAIR_JSON." }, { status: 500 });
    }

    const body = await request.json();
    const resolver = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
    const [market] = marketPda(BigInt(body.fixtureId), Number(body.marketType));
    const dailyScoresMerkleRoots = new PublicKey(body.dailyScoresMerkleRoots);

    const signature = await program.methods
      .resolveMarket(Number(body.winningOutcome), body.scoreProof)
      .accounts({
        market,
        authority: resolver.publicKey,
        dailyScoresMerkleRoots,
        txoracleProgram: txoracleDevnetProgramId
      })
      .signers([resolver])
      .rpc();

    const confirmation = await connection.confirmTransaction(signature, "confirmed");

    return NextResponse.json({ signature, confirmation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve market.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
