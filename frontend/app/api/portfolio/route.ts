import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { accounts, connection, program, programId, serializeAccount } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userParam = request.nextUrl.searchParams.get("user");
    if (!userParam) return NextResponse.json({ positions: [] });

    const user = new PublicKey(userParam);
    const positionAccounts = await connection.getProgramAccounts(programId, {
      filters: [{ memcmp: { offset: 40, bytes: user.toBase58() } }]
    });

    const positions = await Promise.all(
      positionAccounts.map(async ({ pubkey, account }) => {
        const position = program.coder.accounts.decode("betPosition", account.data);
        const marketKey = position.market as PublicKey;
        const market = await accounts.market.fetchNullable(marketKey);

        return {
          publicKey: pubkey.toBase58(),
          position: serializeAccount(position),
          marketPublicKey: marketKey.toBase58(),
          market: market ? serializeAccount(market) : null
        };
      })
    );

    return NextResponse.json({ positions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read portfolio." }, { status: 400 });
  }
}
