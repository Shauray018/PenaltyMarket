use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Market is not open for betting")]
    MarketNotOpen,
    #[msg("Betting period has closed")]
    BettingClosed,
    #[msg("Invalid outcome index")]
    InvalidOutcome,
    #[msg("Market is not resolved yet")]
    NotResolved,
    #[msg("Already claimed winnings")]
    AlreadyClaimed,
    #[msg("Not a winning position")]
    NotAWinner,
    #[msg("Market already resolved")]
    AlreadyResolved,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Unauthorized resolver")]
    UnauthorizedResolver,
}