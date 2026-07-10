use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::errors::MarketError;
use crate::state::*;

pub fn handler(ctx: Context<FundMarket>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, MarketError::InvalidAmount);

    invoke(
        &system_instruction::transfer(
            &ctx.accounts.funder.key(),
            &ctx.accounts.vault.key(),
            amount_lamports,
        ),
        &[
            ctx.accounts.funder.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )
    .map_err(|_| MarketError::TransferFailed)?;

    let market = &mut ctx.accounts.market;
    market.liquidity_deposited = market
        .liquidity_deposited
        .checked_add(amount_lamports)
        .ok_or(MarketError::NumericOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct FundMarket<'info> {
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
    pub funder: Signer<'info>,

    pub system_program: Program<'info, System>,
}
