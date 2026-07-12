---
description: "Keeper commands for demo setup, settlement, and liquidity operations."
icon: terminal
---

# Keeper Scripts

Keeper scripts exist so the demo can be prepared quickly without manual PDA work.

## Existing Escrow Contract

Initialize and fund all standard demo markets:

```bash
npm run keeper:demo-fixture -- <fixtureId>
```

Resolve one market:

```bash
npm run keeper:resolve-demo -- <fixtureId> <winningOutcome> <marketType>
```

Withdraw unreserved liquidity:

```bash
npm run keeper:withdraw-liquidity -- <fixtureId> <marketType>
```

## AMM Contract

Build AMM:

```bash
npm run amm:build
```

Initialize and fund one match-winner AMM:

```bash
npm run amm:bootstrap -- <fixtureId> 1 0
```

Initialize and fund all demo AMM market types:

```bash
AMM_INITIAL_LIQUIDITY_SOL=0.5 npm run amm:demo-fixture -- <fixtureId>
```

Settle automatically where score data is deterministic:

```bash
npm run amm:settle-demo -- <fixtureId> auto 0,1,2,3,4
```

Withdraw unreserved AMM liquidity:

```bash
npm run amm:withdraw -- <fixtureId> 0,1,2,3,4,5 max
```
