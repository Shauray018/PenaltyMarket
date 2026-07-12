---
description: "A concise script for recording or judging the product demo."
icon: clapperboard
---

# Demo Guide

Use this flow for the submission video or live walkthrough.

{% stepper %}
{% step %}
## Open the markets page

Show that fixtures are loaded from TxLINE and presented as soccer prediction markets.
{% endstep %}

{% step %}
## Open a match terminal

Show score state, teams, odds graph, primary outcome market, and prop markets.
{% endstep %}

{% step %}
## Place a prediction

Connect Phantom, select an outcome, enter stake, and sign the transaction.
{% endstep %}

{% step %}
## Show portfolio

Open My Bets and show the wallet position.
{% endstep %}

{% step %}
## Resolve a demo market

Run the keeper resolution script and refresh the portfolio.
{% endstep %}

{% step %}
## Claim or explain settlement

Show claim state for a winning position or explain losing/pending positions.
{% endstep %}
{% endstepper %}

## Suggested Narration

> PenaltyMarket ingests TxLINE fixture, score, and odds data through server-side API routes. Users place wallet-signed predictions on Solana devnet. Funds are held in program-controlled vaults. The current demo uses keeper settlement so the full lifecycle can be shown before real matches finish, and the next resolver upgrade uses TxLINE Merkle proof validation CPI.

## What to Highlight

- live/scheduled match state
- odds from `1X2_PARTICIPANT_RESULT`
- wallet signature flow
- pool and position data from Solana
- settlement and claim lifecycle
- new AMM contract path for production-style liquidity pricing
