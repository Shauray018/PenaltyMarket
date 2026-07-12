---
description: "Server-side API routes used by the frontend."
icon: route
---

# API Routes

The frontend API layer protects secrets and normalizes third-party data before browser code sees it.

## Routes

| Route | Responsibility |
|---|---|
| `GET /api/fixtures` | Fetch and normalize TxLINE fixtures, scores, odds, and market state |
| `GET /api/scores/[fixtureId]` | Fetch score snapshot for one fixture |
| `GET /api/odds/[fixtureId]` | Fetch primary odds for one fixture |
| `GET /api/markets/[fixtureId]` | Read market PDAs and vault/position metadata |
| `POST /api/bet` | Build a wallet-signable bet transaction |
| `GET /api/portfolio` | Read connected wallet positions |
| `POST /api/resolve` | Keeper/admin settlement trigger |
| `GET /api/proof/[fixtureId]` | Fetch proof data for verification views |

{% hint style="danger" %}
TxLINE JWT and API token values must stay server-side. They should never be exposed through `NEXT_PUBLIC_*` variables.
{% endhint %}

## Why Proxy TxLINE

Proxying through Next.js lets the app:

- attach authentication headers securely
- normalize inconsistent payload shapes
- select correct odds markets
- reduce frontend request duplication
- avoid leaking API credentials
