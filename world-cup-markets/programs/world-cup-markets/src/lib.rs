use anchor_lang::prelude::*;

declare_id!("V1qrv6Cc4q9vkAFZR8fsAo7LFKUNJ4bHCdWX2AxxDNA");

pub mod errors;
pub mod instructions;
pub mod state;

// Re-export account structs so Anchor can generate the IDL.
pub use instructions::buy_position::*;
pub use instructions::claim_position::*;
pub use instructions::fund_market::*;
pub use instructions::initialize_market::*;
pub use instructions::refund_position::*;
pub use instructions::resolve_market::*;
pub use instructions::resolve_market_demo::*;
pub use instructions::update_market_close_time::*;
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BinaryExpression {
    Add,
    Subtract,
}

#[program]
pub mod world_cup_markets {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        fixture_id: u64,
        market_type: MarketType,
        options: Vec<String>,
        close_time: i64,
        team1_stat_key: u32,
        team2_stat_key: u32,
        stat_period: i32,
    ) -> Result<()> {
        instructions::initialize_market::handler(
            ctx,
            fixture_id,
            market_type,
            options,
            close_time,
            team1_stat_key,
            team2_stat_key,
            stat_period,
        )
    }

    pub fn fund_market(ctx: Context<FundMarket>, amount_lamports: u64) -> Result<()> {
        instructions::fund_market::handler(ctx, amount_lamports)
    }

    pub fn update_market_close_time(
        ctx: Context<UpdateMarketCloseTime>,
        new_close_time: i64,
    ) -> Result<()> {
        instructions::update_market_close_time::handler(ctx, new_close_time)
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount_lamports: u64) -> Result<()> {
        instructions::withdraw_liquidity::handler(ctx, amount_lamports)
    }

    pub fn buy_position(
        ctx: Context<BuyPosition>,
        position_id: u64,
        outcome_index: u8,
        stake_lamports: u64,
        odds_price: i32,
        odds_proof: OddsProof,
    ) -> Result<()> {
        instructions::buy_position::handler(
            ctx,
            position_id,
            outcome_index,
            stake_lamports,
            odds_price,
            odds_proof,
        )
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: u8,
        score_proof: ScoreProof,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx, winning_outcome, score_proof)
    }

    pub fn resolve_market_demo(ctx: Context<ResolveMarketDemo>, winning_outcome: u8) -> Result<()> {
        instructions::resolve_market_demo::handler(ctx, winning_outcome)
    }

    pub fn claim_position(ctx: Context<ClaimPosition>) -> Result<()> {
        instructions::claim_position::handler(ctx)
    }

    pub fn refund_position(ctx: Context<RefundPosition>) -> Result<()> {
        instructions::refund_position::handler(ctx)
    }
}
