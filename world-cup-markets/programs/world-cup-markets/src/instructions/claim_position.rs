use anchor_lang::prelude::*;

use crate::errors::MarketError;
use crate::state::*;

pub fn handler(ctx: Context<ClaimPosition>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    require!(
        market.status == MarketStatus::Resolved,
        MarketError::NotResolved
    );
    require!(!position.claimed, MarketError::AlreadyClaimed);
    require!(
        position.outcome_index == market.winning_outcome,
        MarketError::NotAWinner
    );

    position.claimed = true;
    market.total_reserved_liability = market
        .total_reserved_liability
        .checked_sub(position.payout_lamports)
        .ok_or(MarketError::NumericOverflow)?;

    **ctx
        .accounts
        .vault
        .to_account_info()
        .try_borrow_mut_lamports()? -= position.payout_lamports;
    **ctx
        .accounts
        .user
        .to_account_info()
        .try_borrow_mut_lamports()? += position.payout_lamports;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimPosition<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump,
        constraint = vault.market == market.key()
    )]
    pub vault: Account<'info, SolVault>,

    #[account(
        mut,
        has_one = market,
        has_one = user
    )]
    pub position: Account<'info, BetPosition>,

    #[account(mut)]
    pub user: Signer<'info>,
}
