---
description: "How PenaltyMarket uses TxLINE fixtures, scores, and odds."
icon: satellite-dish
---

# Data Feeds

PenaltyMarket uses TxLINE as the sports data layer.

## Fixture Data

Fixtures provide:

- `FixtureId`
- participants
- kickoff time
- competition metadata
- game state

The app filters and displays matches that have useful betting data, such as initialized markets or usable odds.

## Score Data

Score snapshots and stream events provide:

- `StatusId`
- score totals
- clock
- event action
- corners and cards where available

Live status is determined from official soccer phases:

| StatusId | Phase | Live |
|---:|---|---|
| 1 | Not Started | No |
| 2 | 1st Half | Yes |
| 3 | Half Time | No |
| 4 | 2nd Half | Yes |
| 7 | Extra Time 1st Half | Yes |
| 9 | Extra Time 2nd Half | Yes |
| 12 | Penalty Shootout | Yes |
| 5, 10, 13 | Finished phases | No |

## Odds Data

The app prioritizes `1X2_PARTICIPANT_RESULT` odds:

```json
{
  "SuperOddsType": "1X2_PARTICIPANT_RESULT",
  "PriceNames": ["part1", "draw", "part2"],
  "Prices": [1815, 3843, 5292],
  "Pct": ["55.096", "26.021", "18.896"]
}
```

The frontend uses these odds for:

- market cards
- match-winner labels
- payout estimates
- odds chart history
- AMM initialization probabilities

{% hint style="warning" %}
Over/under odds are only used for prop markets. Match winner markets must use `1X2_PARTICIPANT_RESULT` with `part1`, `draw`, and `part2`.
{% endhint %}
