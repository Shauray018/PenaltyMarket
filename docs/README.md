---
description: "Technical documentation for PenaltyMarket, a soccer prediction market on Solana devnet powered by TxLINE data."
icon: futbol
layout:
  width: default
  tableOfContents:
    visible: true
  outline:
    visible: true
---

# PenaltyMarket

PenaltyMarket is a soccer prediction market built on Solana devnet. It uses TxLINE fixture, score, odds, and validation feeds to create a match-focused betting experience for soccer fans.

The project has two smart-contract tracks:

- `world-cup-markets/` is the current demo contract used by the frontend for oracle-priced SOL escrow markets.
- `amm-markets/` is a new standalone Anchor program for a prediction-market automated market maker.

{% hint style="info" %}
For the hackathon demo, the current frontend is wired to the existing escrow contract. The new AMM contract is separated in its own Anchor workspace so it can evolve without breaking the working demo flow.
{% endhint %}

## What the Product Shows

<table data-view="cards">
  <thead>
    <tr>
      <th></th>
      <th></th>
      <th data-hidden data-card-target data-type="content-ref"></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Live Soccer Markets</strong></td>
      <td>Fixtures, score state, live odds, pool size, and wallet-based bet entry.</td>
      <td><a href="getting-started/product-overview.md">product overview</a></td>
    </tr>
    <tr>
      <td><strong>TxLINE Integration</strong></td>
      <td>Server-side proxying for fixtures, scores, odds, and validation data.</td>
      <td><a href="txline/data-feeds.md">data feeds</a></td>
    </tr>
    <tr>
      <td><strong>Solana Escrow</strong></td>
      <td>Native devnet SOL vaults, positions, claims, and liquidity accounting.</td>
      <td><a href="contracts/current-escrow.md">current escrow</a></td>
    </tr>
    <tr>
      <td><strong>AMM Roadmap</strong></td>
      <td>TxLINE-seeded AMM pricing that becomes liquidity-driven after launch.</td>
      <td><a href="contracts/amm-contract.md">amm contract</a></td>
    </tr>
  </tbody>
</table>

## Core Thesis

Prediction markets need three things to feel credible:

1. Real-time data that users can understand.
2. Escrowed funds that cannot be moved arbitrarily.
3. Deterministic settlement that can be audited.

PenaltyMarket demonstrates all three in the product flow and isolates the next trustless-settlement upgrade behind the resolver layer.
