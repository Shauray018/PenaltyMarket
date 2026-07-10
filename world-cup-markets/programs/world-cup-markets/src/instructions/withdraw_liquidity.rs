use anchor_lang::prelude::*;

use crate::errors::MarketError;
use crate::state::*;

pub fn handler(ctx: Context<WithdrawLiquidity>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, MarketError::InvalidAmount);
    require!(
        ctx.accounts.market.authority == ctx.accounts.authority.key(),
        MarketError::UnauthorizedResolver
    );
    require!(
        ctx.accounts.market.available_liquidity()? >= amount_lamports,
        MarketError::InsufficientLiquidity
    );

    let market = &mut ctx.accounts.market;
    market.liquidity_withdrawn = market
        .liquidity_withdrawn
        .checked_add(amount_lamports)
        .ok_or(MarketError::NumericOverflow)?;

    **ctx
        .accounts
        .vault
        .to_account_info()
        .try_borrow_mut_lamports()? -= amount_lamports;
    **ctx
        .accounts
        .authority
        .to_account_info()
        .try_borrow_mut_lamports()? += amount_lamports;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump,
        constraint = vault.market == market.key()
    )]
    pub vault: Account<'info, SolVault>,

    #[account(mut)]
    pub authority: Signer<'info>,
}
