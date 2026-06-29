import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import idl from "@/lib/idl/world_cup_markets.json";
import { PROGRAM_ID, SOLANA_RPC_URL } from "@/lib/constants";

export const connection = new Connection(SOLANA_RPC_URL, "confirmed");
export const programId = new PublicKey(PROGRAM_ID);
export const txoracleDevnetProgramId = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

const readonlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx,
  signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs
};

export const provider = new anchor.AnchorProvider(connection, readonlyWallet, {
  commitment: "confirmed"
});

export const program = new anchor.Program(idl as anchor.Idl, provider);
export const accounts = program.account as anchor.Program["account"] & {
  market: {
    fetchNullable: (address: PublicKey) => Promise<Record<string, unknown> | null>;
  };
};

export async function fetchMarketAccount(address: PublicKey) {
  try {
    const account = await accounts.market.fetchNullable(address);
    if (account) return account;
  } catch {
    // Fall back to a raw account read below. Some RPC/Anchor decode failures should not
    // make an initialized market disappear from the app.
  }

  const raw = await connection.getAccountInfo(address);
  if (!raw) return null;

  return program.coder.accounts.decode("market", raw.data) as Record<string, unknown>;
}

export function marketPda(fixtureId: number | bigint, marketType: number) {
  const fixture = Buffer.alloc(8);
  fixture.writeBigUInt64LE(BigInt(fixtureId));
  return PublicKey.findProgramAddressSync([Buffer.from("market"), fixture, Buffer.from([marketType])], programId);
}

export function positionPda(market: PublicKey, user: PublicKey, positionId: number | bigint) {
  const position = Buffer.alloc(8);
  position.writeBigUInt64LE(BigInt(positionId));
  return PublicKey.findProgramAddressSync([Buffer.from("position"), market.toBuffer(), user.toBuffer(), position], programId);
}

export function vaultPda(market: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], programId);
}

export function serializeAccount(value: unknown): unknown {
  if (anchor.BN.isBN(value)) return value.toString();
  if (value instanceof PublicKey) return value.toBase58();
  if (Array.isArray(value)) return value.map(serializeAccount);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeAccount(item)]));
  }
  return value;
}
