import type { NextConfig } from "next";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

loadRootEnv();

const nextConfig: NextConfig = {
  serverExternalPackages: ["@coral-xyz/anchor", "@solana/web3.js"]
};

export default nextConfig;

function loadRootEnv() {
  const path = resolve(process.cwd(), "../.env");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
  }
}
