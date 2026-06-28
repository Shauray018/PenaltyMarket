import { NextResponse } from "next/server";
import { MARKET_TYPES } from "@/lib/constants";
import { accounts, marketPda, serializeAccount } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const id = BigInt(fixtureId);

  const markets = await Promise.all(
    MARKET_TYPES.map(async (marketType) => {
      const [publicKey] = marketPda(id, marketType.index);
      try {
        const account = await accounts.market.fetchNullable(publicKey);
        return {
          publicKey: publicKey.toBase58(),
          marketType,
          exists: Boolean(account),
          account: account ? serializeAccount(account) : null
        };
      } catch (error) {
        return {
          publicKey: publicKey.toBase58(),
          marketType,
          exists: false,
          account: null,
          error: error instanceof Error ? error.message : "Unable to read market."
        };
      }
    })
  );

  return NextResponse.json({ fixtureId, markets });
}
