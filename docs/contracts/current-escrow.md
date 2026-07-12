---
description: "The deployed demo contract used by the current frontend."
icon: vault
---

# Current Escrow Contract

The current deployed contract is `world-cup-markets`.

```text
Program ID: V1qrv6Cc4q9vkAFZR8fsAo7LFKUNJ4bHCdWX2AxxDNA
Network: Solana devnet
```

## Model

The contract is an oracle-priced escrow market:

- users stake devnet SOL
- payout is calculated from TxLINE odds
- the market vault holds SOL liquidity
- the contract reserves liability for open positions
- winners claim after resolution
- authority can withdraw only unreserved liquidity

## Main Instructions

| Instruction | Purpose |
|---|---|
| `initialize_market` | Create a fixture/type market PDA |
| `fund_market` | Deposit devnet SOL liquidity into the vault |
| `buy_position` | Buy a prediction position with wallet SOL |
| `resolve_market` | Mark the winning outcome |
| `claim_winnings` | Pay winning user |
| `withdraw_liquidity` | Withdraw unreserved liquidity |

## PDA Model

```text
Market PDA: ["market", fixture_id_le_u64, market_type_u8]
Position PDA: ["position", market, user]
Vault PDA: ["vault", market]
```

{% hint style="info" %}
This contract is not a full AMM. It is the stable demo path for showing escrow, betting, settlement, claims, and liquidity accounting.
{% endhint %}
