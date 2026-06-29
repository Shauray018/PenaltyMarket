import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { MARKET_TYPES } from "@/lib/constants";
import { connection, fetchMarketAccount, marketPda, program, programId, serializeAccount } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const id = BigInt(fixtureId);

  const markets = await Promise.all(
    MARKET_TYPES.map(async (marketType) => {
      const [publicKey] = marketPda(id, marketType.index);
      try {
        const account = await fetchMarketAccount(publicKey);
        let traderCount = 0;
        let positionCount = 0;

        if (account) {
          const counts = await loadTraderCounts(publicKey);
          traderCount = counts.traderCount;
          positionCount = counts.positionCount;
        }

        return {
          publicKey: publicKey.toBase58(),
          marketType,
          exists: Boolean(account),
          account: account
            ? {
                ...(serializeAccount(account) as Record<string, unknown>),
                traderCount,
                positionCount
              }
            : null
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

async function loadTraderCounts(market: PublicKey) {
  try {
    const positionAccounts = await connection.getProgramAccounts(programId, {
      filters: [{ memcmp: { offset: 8, bytes: market.toBase58() } }]
    });

    const traders = new Set<string>();
    for (const { account: raw } of positionAccounts) {
      try {
        const position = program.coder.accounts.decode("betPosition", raw.data) as { user: PublicKey };
        traders.add(position.user.toBase58());
      } catch {
        // Keep market reads working even if an older position account cannot decode.
      }
    }

    return { traderCount: traders.size, positionCount: positionAccounts.length };
  } catch {
    return { traderCount: 0, positionCount: 0 };
  }
}
