import { USDC_DECIMALS } from "@/lib/constants";

const LAMPORTS_PER_SOL = 1_000_000_000n;

export function formatSol(raw: string | number | bigint) {
  const value = BigInt(raw);
  const whole = value / LAMPORTS_PER_SOL;
  const fraction = (value % LAMPORTS_PER_SOL).toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} SOL`;
}

export function parseSol(input: string) {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,9})?$/.test(trimmed)) {
    throw new Error("Enter a SOL amount with up to 9 decimals.");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(9, "0"));
}

export function formatUsdc(raw: string | number | bigint) {
  const value = BigInt(raw);
  const scale = BigInt(10 ** USDC_DECIMALS);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} USDC`;
}

export function parseUsdc(input: string) {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error("Enter a USDC amount with up to 6 decimals.");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function shortKey(value: string) {
  return value.length > 12 ? `${value.slice(0, 4)}...${value.slice(-4)}` : value;
}

export function formatKickoff(startTime?: number) {
  if (!startTime) return "Kickoff unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(startTime));
}
