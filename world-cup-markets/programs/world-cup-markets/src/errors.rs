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
    #[msg("Too many outcomes")]
    TooManyOutcomes,
    #[msg("Outcome name is too long")]
    OutcomeNameTooLong,
    #[msg("Insufficient market liquidity")]
    InsufficientLiquidity,
    #[msg("Invalid TxODDS oracle program")]
    InvalidOracleProgram,
    #[msg("Invalid TxODDS odds proof")]
    InvalidOddsProof,
    #[msg("Invalid TxODDS score proof")]
    InvalidScoreProof,
    #[msg("Invalid odds price")]
    InvalidOddsPrice,
    #[msg("Native SOL transfer failed")]
    TransferFailed,
    #[msg("Position is not refundable")]
    NotRefundable,
    #[msg("Market has not been cancelled")]
    NotCancelled,
    #[msg("Invalid market close time")]
    InvalidCloseTime,
    #[msg("Numeric overflow")]
    NumericOverflow,
}
