---
description: "What is implemented today and what is intentionally marked as the next trustless upgrade."
icon: video
---

# Demo Scope

The project has a working demo path and a parallel AMM contract path.

## Implemented Demo Path

- Next.js app router frontend
- TxLINE fixture, score, and odds API proxying
- Phantom wallet connection
- Solana devnet transaction building
- Native devnet SOL betting
- Market vault liquidity
- Portfolio reads
- Demo market resolution
- Winner claim flow
- Liquidity withdrawal for unreserved funds

## AMM Path

The new `amm-markets/` program adds the AMM primitive:

- TxLINE odds seed initial AMM probabilities
- liquidity providers deposit devnet SOL
- users buy outcome shares
- prices move from outstanding AMM shares
- winning shares redeem from the vault

{% hint style="warning" %}
The AMM contract currently uses authority-controlled demo settlement. The settlement interface is intentionally isolated so the next iteration can replace demo resolution with TxLINE validation CPI without rewriting AMM accounting.
{% endhint %}

## What Judges Should Look For

The core hackathon criteria map directly to the demo:

- **Core functionality:** live/simulated TxLINE feeds drive the market UI.
- **User experience:** soccer-focused market cards, match terminal, odds chart, bet slip, and portfolio.
- **Code quality and logic:** separate server-side API routes, on-chain vault accounting, deterministic payout/settlement paths, and a clean AMM workspace for the next version.
