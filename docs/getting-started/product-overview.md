---
description: "What PenaltyMarket is, who it is for, and what the hackathon demo proves."
icon: trophy
---

# Product Overview

PenaltyMarket is a soccer-first prediction market where users connect a Solana wallet, choose a match, pick an outcome, and place a devnet SOL prediction.

The frontend is designed around a live match terminal:

- fixture cards for upcoming and live soccer matches
- match detail pages with score state and odds history
- bet slips with estimated payout
- wallet signing through Phantom
- portfolio tracking for open and settled positions

## User Scenario

A user opens the markets page, finds a match such as Spain vs Belgium, checks the live score and odds chart, and buys a position on an outcome. When the match resolves, the winning side can claim from the market vault.

## Why TxLINE Matters

TxLINE gives the application sports-native data:

- fixture metadata
- live score events
- odds snapshots and updates
- Merkle proof endpoints for validation

This makes the demo more than a static betting UI. The app reacts to real soccer feed data and can be upgraded toward fully trustless settlement.

{% hint style="success" %}
The demo focuses on a complete user experience: discover a match, inspect live data, place a wallet-signed bet, view the portfolio, resolve the market, and claim or withdraw according to contract state.
{% endhint %}
