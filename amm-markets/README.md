# Penalty AMM Markets

This is a separate Anchor program for a devnet SOL prediction-market AMM. It does not overwrite or reuse the existing `world-cup-markets` program.

Program ID:

```text
EbdvTA5GAHZru1f2pwAnu2mPgaWuZQBXXKz16VUiJXvM
```

## Model

- TxLINE odds seed the opening probability vector.
- After initialization, prices move from AMM state: virtual shares plus outstanding outcome shares.
- A user buys outcome shares. If that outcome wins, each share redeems 1 lamport.
- The vault holds devnet SOL as collateral.
- The contract enforces solvency by requiring vault collateral to cover the largest possible winning outcome liability.

## Commands

Build:

```bash
npm run amm:build
```

Initialize one Match Winner AMM and fund it:

```bash
npm run amm:bootstrap -- <fixtureId> 1 0
```

Initialize all demo market types and fund each with 0.5 SOL unless overridden:

```bash
AMM_INITIAL_LIQUIDITY_SOL=0.5 npm run amm:demo-fixture -- <fixtureId>
```

Resolve from TxLINE scores where possible:

```bash
npm run amm:settle-demo -- <fixtureId> auto 0,1,2,3,4
```

Resolve explicit winners for all demo market types:

```bash
npm run amm:settle-demo -- <fixtureId> 0:0,1:0,2:1,3:1,4:0,5:0 0,1,2,3,4,5
```

Withdraw remaining liquidity:

```bash
npm run amm:withdraw -- <fixtureId> 0,1,2,3,4,5 max
```

## Settlement Note

The current AMM program has authority-controlled demo settlement so the demo can be run before TxLINE score proof CPI is fully wired. The contract is structured so `resolve_market` can be replaced with a TxLINE validation CPI path without changing the AMM position, liquidity, claim, or vault model.
