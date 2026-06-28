import { PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { connection, program, vaultPda } from "@/lib/solana";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = new PublicKey(body.user);
    const market = new PublicKey(body.market);
    const position = new PublicKey(body.position);
    const [vault] = vaultPda(market);

    const tx = await program.methods
      .claimPosition()
      .accounts({
        market,
        vault,
        position,
        user
      })
      .transaction();

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = user;
    tx.recentBlockhash = blockhash;

    return NextResponse.json({
      transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"),
      lastValidBlockHeight
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to build claim transaction." }, { status: 400 });
  }
}
