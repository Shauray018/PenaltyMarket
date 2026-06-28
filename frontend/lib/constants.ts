export const PROGRAM_ID = "V1qrv6Cc4q9vkAFZR8fsAo7LFKUNJ4bHCdWX2AxxDNA";
export const USDC_MINT = "2SHyVFdoYrUaQ6Ns9FmNf28RSt1TJ6tXFwLEGmbBnqmM";
export const USDC_DECIMALS = 6;
export const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";
export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const MARKET_TYPES = [
  { index: 0, id: "matchWinner", label: "Match Winner", options: ["Team 1", "Draw", "Team 2"] },
  { index: 1, id: "totalGoals", label: "Total Goals", options: ["Over", "Under"] },
  { index: 2, id: "totalCorners", label: "Total Corners", options: ["Over", "Under"] },
  { index: 3, id: "totalYellowCards", label: "Total Yellow Cards", options: ["Over", "Under"] },
  { index: 4, id: "bothTeamsScore", label: "Both Teams Score", options: ["Yes", "No"] },
  { index: 5, id: "firstYellowCard", label: "First Yellow Card", options: ["Team 1", "Team 2", "None"] }
] as const;

export type MarketTypeIndex = (typeof MARKET_TYPES)[number]["index"];

export function getMarketType(index: number) {
  return MARKET_TYPES.find((marketType) => marketType.index === index);
}
