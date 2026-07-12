---
description: "Planned upgrades after the hackathon demo."
icon: road
---

# Next Steps

## Near Term

- Wire frontend to the new AMM contract.
- Add AMM quote preview to the bet slip.
- Add AMM position reads to the portfolio.
- Add one-command fixture bootstrap for all market types with safer liquidity budgeting.

## Trustless Settlement

- Implement score-stat proof CPI resolver.
- Replace demo authority resolution.
- Add proof viewer pages for score and odds validation.
- Add permissionless settlement transactions once final data is available.

## Market Quality

- Improve AMM curve math for deeper liquidity.
- Add fees and LP accounting.
- Add slippage controls in the UI.
- Add market pause/cancel flows for invalid fixtures.

## Production Readiness

- Rate-limit TxLINE proxy routes.
- Add backend cache for fixture and odds data.
- Add persistent indexer for positions.
- Add monitoring for keeper jobs.
- Add security review for all vault movement instructions.
