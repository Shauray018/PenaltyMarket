use anchor_lang::prelude::*;

use crate::state::*;
use crate::AmmError;

pub fn handler(ctx: Context<ResolveMarket>, winning_outcome: u8) -> Result<()> {
    require!(
        ctx.accounts.market.authority == ctx.accounts.authority.key(),
        AmmError::Unauthorized
    );
    require!(
        ctx.accounts.market.status != MarketStatus::Resolved,
        AmmError::AlreadyResolved
    );
    require!(
        (winning_outcome as usize) < ctx.accounts.market.options.len(),
        AmmError::InvalidOutcome
    );

    let market = &mut ctx.accounts.market;
    for (index, shares) in market.outcome_shares.iter_mut().enumerate() {
        if index != winning_outcome as usize {
            *shares = 0;
        }
    }
    market.status = MarketStatus::Resolved;
    market.winning_outcome = winning_outcome;

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, AmmMarket>,

    pub authority: Signer<'info>,
}
