use anchor_lang::prelude::*;

use crate::errors::MarketError;
use crate::state::*;

pub fn handler(ctx: Context<ResolveMarketDemo>, winning_outcome: u8) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(
        ctx.accounts.authority.key() == market.authority,
        MarketError::UnauthorizedResolver
    );
    require!(
        market.status != MarketStatus::Resolved,
        MarketError::AlreadyResolved
    );
    require!(
        market.status != MarketStatus::Cancelled,
        MarketError::NotRefundable
    );
    require!(
        (winning_outcome as usize) < market.options.len(),
        MarketError::InvalidOutcome
    );
    let market = &mut ctx.accounts.market;
    market.status = MarketStatus::Resolved;
    market.winning_outcome = winning_outcome;
    market.total_reserved_liability = market.outcome_liabilities[winning_outcome as usize];
    market.resolved_ts = Clock::get()?.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveMarketDemo<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    pub authority: Signer<'info>,
}
