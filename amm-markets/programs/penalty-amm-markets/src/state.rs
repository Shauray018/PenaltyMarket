use crate::{AmmError, MarketType};
use anchor_lang::prelude::*;

pub const MAX_OPTIONS: usize = 8;
pub const MAX_OPTION_LEN: usize = 40;
pub const BPS_DENOMINATOR: u128 = 10_000;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    Resolved,
    Cancelled,
}

#[account]
pub struct AmmMarket {
    pub fixture_id: u64,
    pub market_type: MarketType,
    pub options: Vec<String>,
    pub virtual_shares: Vec<u64>,
    pub outcome_shares: Vec<u64>,
    pub liquidity_deposited: u64,
    pub liquidity_withdrawn: u64,
    pub trader_collateral: u64,
    pub claims_paid: u64,
    pub fees_collected: u64,
    pub fee_bps: u16,
    pub liquidity_parameter: u64,
    pub status: MarketStatus,
    pub winning_outcome: u8,
    pub close_time: i64,
    pub authority: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
}

impl AmmMarket {
    pub const SPACE: usize = 8
        + 8
        + 1
        + 4
        + (MAX_OPTIONS * (4 + MAX_OPTION_LEN))
        + 4
        + (MAX_OPTIONS * 8)
        + 4
        + (MAX_OPTIONS * 8)
        + 8
        + 8
        + 8
        + 8
        + 8
        + 2
        + 8
        + 1
        + 1
        + 8
        + 32
        + 1
        + 1;

    pub fn collateral_pool(&self) -> Result<u64> {
        self.liquidity_deposited
            .checked_add(self.trader_collateral)
            .and_then(|value| value.checked_sub(self.liquidity_withdrawn))
            .and_then(|value| value.checked_sub(self.claims_paid))
            .ok_or(AmmError::NumericOverflow.into())
    }

    pub fn max_liability(&self) -> u64 {
        self.outcome_shares.iter().copied().max().unwrap_or(0)
    }

    pub fn available_liquidity(&self) -> Result<u64> {
        self.collateral_pool()?
            .checked_sub(self.max_liability())
            .ok_or(AmmError::InsufficientLiquidity.into())
    }

    pub fn total_curve_shares(&self) -> Result<u128> {
        let mut total = 0u128;
        for (virtual_share, sold_share) in
            self.virtual_shares.iter().zip(self.outcome_shares.iter())
        {
            total = total
                .checked_add(*virtual_share as u128)
                .and_then(|value| value.checked_add(*sold_share as u128))
                .ok_or(AmmError::NumericOverflow)?;
        }
        Ok(total)
    }

    pub fn spot_price_bps(&self, outcome_index: usize) -> Result<u16> {
        let numerator = self
            .virtual_shares
            .get(outcome_index)
            .copied()
            .ok_or(AmmError::InvalidOutcome)? as u128
            + self
                .outcome_shares
                .get(outcome_index)
                .copied()
                .ok_or(AmmError::InvalidOutcome)? as u128;
        let denominator = self.total_curve_shares()?;
        if denominator == 0 {
            return Err(AmmError::InvalidProbabilities.into());
        }
        let bps = numerator
            .checked_mul(BPS_DENOMINATOR)
            .ok_or(AmmError::NumericOverflow)?
            .checked_div(denominator)
            .ok_or(AmmError::NumericOverflow)?;
        u16::try_from(bps).map_err(|_| AmmError::NumericOverflow.into())
    }

    pub fn quote_buy_exact_shares(&self, outcome_index: usize, shares: u64) -> Result<u64> {
        if shares == 0 {
            return Err(AmmError::InvalidAmount.into());
        }

        let current_outcome = self
            .virtual_shares
            .get(outcome_index)
            .copied()
            .ok_or(AmmError::InvalidOutcome)? as u128
            + self
                .outcome_shares
                .get(outcome_index)
                .copied()
                .ok_or(AmmError::InvalidOutcome)? as u128;
        let current_total = self.total_curve_shares()?;
        let shares_u128 = shares as u128;
        let midpoint_outcome = current_outcome
            .checked_mul(2)
            .and_then(|value| value.checked_add(shares_u128))
            .ok_or(AmmError::NumericOverflow)?;
        let midpoint_total = current_total
            .checked_mul(2)
            .and_then(|value| value.checked_add(shares_u128))
            .ok_or(AmmError::NumericOverflow)?;

        let gross = shares_u128
            .checked_mul(midpoint_outcome)
            .ok_or(AmmError::NumericOverflow)?
            .checked_div(midpoint_total)
            .ok_or(AmmError::NumericOverflow)?;
        let fee = gross
            .checked_mul(self.fee_bps as u128)
            .ok_or(AmmError::NumericOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(AmmError::NumericOverflow)?;
        let cost = gross.checked_add(fee).ok_or(AmmError::NumericOverflow)?;

        u64::try_from(cost.max(1)).map_err(|_| AmmError::NumericOverflow.into())
    }
}

#[account]
pub struct AmmPosition {
    pub market: Pubkey,
    pub user: Pubkey,
    pub position_id: u64,
    pub outcome_index: u8,
    pub shares: u64,
    pub cost_lamports: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl AmmPosition {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 1 + 1;
}

#[account]
pub struct AmmVault {
    pub market: Pubkey,
    pub bump: u8,
}

impl AmmVault {
    pub const SPACE: usize = 8 + 32 + 1;
}
