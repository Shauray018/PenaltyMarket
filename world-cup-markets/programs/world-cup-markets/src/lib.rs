use anchor_lang::prelude::*;

declare_id!("V1qrv6Cc4q9vkAFZR8fsAo7LFKUNJ4bHCdWX2AxxDNA"); // we'll fill this after build

pub mod errors;
pub mod state;
pub mod instructions;

// Re-export everything so #[program] macro can find account structs
pub use instructions::initialize_market::*;
pub use instructions::place_bet::*;
pub use instructions::resolve_market::*;
pub use instructions::claim_winnings::*;

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
pub mod world_cup_markets {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        fixture_id: u64,
        market_type: MarketType,
        options: Vec<String>,
        close_time: i64,
    ) -> Result<()> {
        instructions::initialize_market::handler(ctx, fixture_id, market_type, options, close_time)
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        outcome_index: u8,
        amount: u64,
    ) -> Result<()> {
        instructions::place_bet::handler(ctx, outcome_index, amount)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: u8,
        proof_data: Vec<u8>,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx, winning_outcome, proof_data)
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }
}