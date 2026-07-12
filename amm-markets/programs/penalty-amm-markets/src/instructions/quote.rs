use anchor_lang::prelude::*;

use crate::state::*;
use crate::AmmError;

pub fn handler(ctx: Context<QuoteBuyExactShares>, outcome_index: u8, shares: u64) -> Result<()> {
    require!(
        (outcome_index as usize) < ctx.accounts.market.options.len(),
        AmmError::InvalidOutcome
    );
    let cost_lamports = ctx
        .accounts
        .market
        .quote_buy_exact_shares(outcome_index as usize, shares)?;
    let spot_price_bps = ctx.accounts.market.spot_price_bps(outcome_index as usize)?;

    emit!(QuoteBuyExactSharesEvent {
        market: ctx.accounts.market.key(),
        outcome_index,
        shares,
        cost_lamports,
        spot_price_bps,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct QuoteBuyExactShares<'info> {
    pub market: Account<'info, AmmMarket>,
}

#[event]
pub struct QuoteBuyExactSharesEvent {
    pub market: Pubkey,
    pub outcome_index: u8,
    pub shares: u64,
    pub cost_lamports: u64,
    pub spot_price_bps: u16,
}
