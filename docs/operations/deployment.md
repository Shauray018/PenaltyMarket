---
description: "Environment variables, build commands, and deployment notes."
icon: rocket
---

# Deployment

## Environment

Required values:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
TXLINE_BASE_URL=https://txline.txodds.com
TXLINE_JWT=YOUR_SESSION_JWT
TXLINE_API_TOKEN=YOUR_LONG_LIVED_API_TOKEN
SOLANA_KEYPAIR=~/.config/solana/id.json
```

## Frontend

```bash
npm run typecheck
npm run build
npm run dev
```

The frontend can be deployed to Vercel as long as server-side environment variables are set in the Vercel project.

## Current Contract

The existing deployed contract is:

```text
V1qrv6Cc4q9vkAFZR8fsAo7LFKUNJ4bHCdWX2AxxDNA
```

## AMM Contract

Build:

```bash
npm run amm:build
```

Deploy:

```bash
cd amm-markets
anchor deploy
```

{% hint style="warning" %}
The generated AMM deploy keypair is local under `amm-markets/target/deploy/`. That directory is intentionally gitignored.
{% endhint %}
