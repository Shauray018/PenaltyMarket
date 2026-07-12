use anchor_lang::prelude::*;

#[error_code]
pub enum AmmError {
    #[msg("Market is not open")]
    MarketNotOpen,
    #[msg("Betting period has closed")]
    BettingClosed,
    #[msg("Invalid outcome index")]
    InvalidOutcome,
    #[msg("Invalid option list")]
    InvalidOptions,
    #[msg("Option name is too long")]
    OptionNameTooLong,
    #[msg("Invalid probability vector")]
    InvalidProbabilities,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid fee")]
    InvalidFee,
    #[msg("Insufficient market liquidity")]
    InsufficientLiquidity,
    #[msg("Slippage limit exceeded")]
    SlippageExceeded,
    #[msg("Market already resolved")]
    AlreadyResolved,
    #[msg("Market is not resolved")]
    NotResolved,
    #[msg("Position already claimed")]
    AlreadyClaimed,
    #[msg("Position is not a winner")]
    NotAWinner,
    #[msg("Unauthorized authority")]
    Unauthorized,
    #[msg("Native SOL transfer failed")]
    TransferFailed,
    #[msg("Numeric overflow")]
    NumericOverflow,
}
