use anchor_lang::prelude::*;
use crate::MarketType;

#[account]
pub struct Market {
    pub fixture_id: u64,
    pub market_type: MarketType,
    pub options: Vec<String>,
    pub outcome_pools: Vec<u64>,
    pub total_pool: u64,
    pub status: MarketStatus,
    pub winning_outcome: u8,
    pub close_time: i64,
    pub resolver: Pubkey,
    pub bump: u8,
    pub line: Option<i64>,
}

impl Market {
    pub const MAX_SIZE: usize = 8 + 8 + 2 + 4 + (4 * 32) + 4 + (4 * 8) + 8 + 1 + 1 + 8 + 32 + 1 + 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    Closed,
    Resolved,
}

#[account]
pub struct BetPosition {
    pub market: Pubkey,
    pub user: Pubkey,
    pub outcome_index: u8,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl BetPosition {
    pub const SIZE: usize = 8 + 32 + 32 + 1 + 8 + 1 + 1;
}