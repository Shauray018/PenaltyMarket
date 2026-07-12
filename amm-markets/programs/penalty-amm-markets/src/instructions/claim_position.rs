use anchor_lang::prelude::*;

use crate::state::*;
use crate::AmmError;

pub fn handler(ctx: Context<ClaimPosition>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    require!(
        market.status == MarketStatus::Resolved,
        AmmError::NotResolved
    );
    require!(!position.claimed, AmmError::AlreadyClaimed);
    require!(
        position.outcome_index == market.winning_outcome,
        AmmError::NotAWinner
    );

    position.claimed = true;
    let outcome_index = position.outcome_index as usize;
    market.outcome_shares[outcome_index] = market.outcome_shares[outcome_index]
        .checked_sub(position.shares)
        .ok_or(AmmError::NumericOverflow)?;
    market.claims_paid = market
        .claims_paid
        .checked_add(position.shares)
        .ok_or(AmmError::NumericOverflow)?;

    **ctx
        .accounts
        .vault
        .to_account_info()
        .try_borrow_mut_lamports()? -= position.shares;
    **ctx
        .accounts
        .user
        .to_account_info()
        .try_borrow_mut_lamports()? += position.shares;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimPosition<'info> {
    #[account(mut)]
    pub market: Account<'info, AmmMarket>,

    #[account(
        mut,
        seeds = [b"amm-vault", market.key().as_ref()],
        bump = market.vault_bump,
        constraint = vault.market == market.key()
    )]
    pub vault: Account<'info, AmmVault>,

    #[account(
        mut,
        has_one = market,
        has_one = user
    )]
    pub position: Account<'info, AmmPosition>,

    #[account(mut)]
    pub user: Signer<'info>,
}
