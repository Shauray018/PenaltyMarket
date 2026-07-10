use crate::{BinaryExpression, Comparison, MarketType};
use anchor_lang::prelude::*;

pub const MAX_OPTIONS: usize = 8;
pub const MAX_OPTION_LEN: usize = 32;
pub const ODDS_PRICE_SCALE: u128 = 1_000;
pub const TXORACLE_DEVNET_PROGRAM_ID: Pubkey =
    pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

#[account]
pub struct Market {
    pub fixture_id: u64,
    pub market_type: MarketType,
    pub options: Vec<String>,
    pub outcome_stakes: Vec<u64>,
    pub outcome_liabilities: Vec<u64>,
    pub total_staked: u64,
    pub total_reserved_liability: u64,
    pub liquidity_deposited: u64,
    pub liquidity_withdrawn: u64,
    pub status: MarketStatus,
    pub winning_outcome: u8,
    pub close_time: i64,
    pub authority: Pubkey,
    pub team1_stat_key: u32,
    pub team2_stat_key: u32,
    pub stat_period: i32,
    pub resolved_ts: i64,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Market {
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
        + 1
        + 1
        + 8
        + 32
        + 4
        + 4
        + 4
        + 8
        + 1
        + 1;

    pub fn available_liquidity(&self) -> Result<u64> {
        let locked_extra = self
            .total_reserved_liability
            .checked_sub(self.total_staked)
            .unwrap_or(0);

        self.liquidity_deposited
            .checked_sub(self.liquidity_withdrawn)
            .and_then(|v| v.checked_sub(locked_extra))
            .ok_or(crate::errors::MarketError::InsufficientLiquidity.into())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    Closed,
    Resolved,
    Cancelled,
}

#[account]
pub struct BetPosition {
    pub market: Pubkey,
    pub user: Pubkey,
    pub position_id: u64,
    pub outcome_index: u8,
    pub stake_lamports: u64,
    pub odds_price: i32,
    pub payout_lamports: u64,
    pub odds_message_id: String,
    pub odds_ts: i64,
    pub claimed: bool,
    pub bump: u8,
}

impl BetPosition {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1 + 8 + 4 + 8 + 4 + 96 + 8 + 1 + 1;
}

#[account]
pub struct SolVault {
    pub market: Pubkey,
    pub bump: u8,
}

impl SolVault {
    pub const SPACE: usize = 8 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateStatsU32 {
    pub update_count: u32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateStatsI32 {
    pub update_count: i32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OddsSnapshot {
    pub fixture_id: i64,
    pub message_id: String,
    pub ts: i64,
    pub bookmaker: String,
    pub bookmaker_id: i32,
    pub super_odds_type: String,
    pub game_state: Option<String>,
    pub in_running: bool,
    pub market_parameters: Option<String>,
    pub market_period: Option<String>,
    pub price_names: Vec<String>,
    pub prices: Vec<i32>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OddsBatchSummary {
    pub fixture_id: i64,
    pub update_stats: UpdateStatsU32,
    pub odds_sub_tree_root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OddsProof {
    pub ts: i64,
    pub odds_snapshot: OddsSnapshot,
    pub summary: OddsBatchSummary,
    pub sub_tree_proof: Vec<ProofNode>,
    pub main_tree_proof: Vec<ProofNode>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoresBatchSummary {
    pub fixture_id: i64,
    pub update_stats: UpdateStatsI32,
    pub events_sub_tree_root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoreStat {
    pub key: u32,
    pub value: i32,
    pub period: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StatTerm {
    pub stat_to_prove: ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof: Vec<ProofNode>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoreProof {
    pub ts: i64,
    pub fixture_summary: ScoresBatchSummary,
    pub fixture_proof: Vec<ProofNode>,
    pub main_tree_proof: Vec<ProofNode>,
    pub predicate: TraderPredicate,
    pub stat_a: StatTerm,
    pub stat_b: Option<StatTerm>,
    pub op: Option<BinaryExpression>,
}
