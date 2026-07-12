---
description: "How markets move from fixture discovery to betting, settlement, claiming, and liquidity withdrawal."
icon: arrows-spin
---

# Market Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Discovered
    Discovered --> Initialized: keeper creates market
    Initialized --> Funded: liquidity deposited
    Funded --> Open: betting window active
    Open --> Resolved: keeper or validation resolver
    Resolved --> Claimed: winning users claim
    Resolved --> Withdrawn: unreserved liquidity withdrawn
    Claimed --> Withdrawn
```

## Lifecycle Stages

{% stepper %}
{% step %}
## Discover fixture

The app reads TxLINE fixtures and normalizes participant names, kickoff time, match phase, and score status.
{% endstep %}

{% step %}
## Initialize market

A keeper creates a market PDA for the fixture and market type. For the AMM contract, TxLINE odds seed the initial probability vector.
{% endstep %}

{% step %}
## Fund vault

The market authority deposits devnet SOL liquidity into the vault PDA so user payouts can be covered.
{% endstep %}

{% step %}
## Place prediction

The app builds a transaction, the wallet signs it, and the program records the user position.
{% endstep %}

{% step %}
## Resolve result

Demo settlement is authority-controlled. The trustless path replaces this with TxLINE validation CPI.
{% endstep %}

{% step %}
## Claim or withdraw

Winners claim from the vault. The market authority can withdraw liquidity that is not reserved for outstanding liability.
{% endstep %}
{% endstepper %}
