---
description: "How settlement, claims, and liquidity withdrawal work."
icon: scale-balanced
---

# Settlement Model

PenaltyMarket separates three concepts:

- **Resolution:** deciding the winning outcome.
- **Claims:** paying users who bought the winning outcome.
- **Liquidity withdrawal:** returning unreserved vault funds to the market authority.

## Escrow Contract Settlement

The current contract stores a fixed payout quote when the position is bought. After resolution:

- winning users claim their quoted payout
- losing positions remain unclaimable
- liquidity withdrawal only allows unreserved funds

## AMM Settlement

The AMM stores outcome shares. After resolution:

- only the winning outcome's shares remain relevant
- each winning share redeems 1 lamport
- claimed shares reduce outstanding liability
- any collateral above remaining liability is withdrawable

## Future Trustless Settlement

The next production resolver should:

1. fetch TxLINE final score/stat proof
2. pass proof data into the market program
3. CPI into the TxLINE validation program
4. compute the winning outcome on-chain
5. store the resolved state

This keeps fund routing native to Solana while using TxLINE proofs as the data validity layer.
