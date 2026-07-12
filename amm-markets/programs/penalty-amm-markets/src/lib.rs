#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;

declare_id!("EbdvTA5GAHZru1f2pwAnu2mPgaWuZQBXXKz16VUiJXvM");

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::buy_shares::*;
pub use instructions::claim_position::*;
pub use instructions::deposit_liquidity::*;
pub use instructions::initialize_market::*;
pub use instructions::quote::*;
pub use instructions::resolve_market::*;
pub use instructions::withdraw_liquidity::*;
pub use state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketType {
    MatchWinner,
    TotalGoals,
    TotalCorners,
    TotalYellowCards,
    BothTeamsScore,
    FirstYellowCard,
}

#[program]
pub mod penalty_amm_markets {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        fixture_id: u64,
        market_type: MarketType,
        options: Vec<String>,
        close_time: i64,
        initial_probabilities_bps: Vec<u16>,
        liquidity_parameter: u64,
        fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_market::handler(
            ctx,
            fixture_id,
            market_type,
            options,
            close_time,
            initial_probabilities_bps,
            liquidity_parameter,
            fee_bps,
        )
    }

    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount_lamports: u64) -> Result<()> {
        instructions::deposit_liquidity::handler(ctx, amount_lamports)
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        position_id: u64,
        outcome_index: u8,
        shares: u64,
        max_cost_lamports: u64,
    ) -> Result<()> {
        instructions::buy_shares::handler(
            ctx,
            position_id,
            outcome_index,
            shares,
            max_cost_lamports,
        )
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
        instructions::resolve_market::handler(ctx, winning_outcome)
    }

    pub fn claim_position(ctx: Context<ClaimPosition>) -> Result<()> {
        instructions::claim_position::handler(ctx)
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount_lamports: u64) -> Result<()> {
        instructions::withdraw_liquidity::handler(ctx, amount_lamports)
    }

    pub fn quote_buy_exact_shares(
        ctx: Context<QuoteBuyExactShares>,
        outcome_index: u8,
        shares: u64,
    ) -> Result<()> {
        instructions::quote::handler(ctx, outcome_index, shares)
    }
}
