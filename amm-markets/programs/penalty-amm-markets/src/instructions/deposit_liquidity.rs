use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::state::*;
use crate::AmmError;

pub fn handler(ctx: Context<DepositLiquidity>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, AmmError::InvalidAmount);

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
    .map_err(|_| AmmError::TransferFailed)?;

    let market = &mut ctx.accounts.market;
    market.liquidity_deposited = market
        .liquidity_deposited
        .checked_add(amount_lamports)
        .ok_or(AmmError::NumericOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(mut)]
    pub market: Account<'info, AmmMarket>,

    #[account(
        mut,
        seeds = [b"amm-vault", market.key().as_ref()],
        bump = market.vault_bump,
        constraint = vault.market == market.key()
    )]
    pub vault: Account<'info, AmmVault>,

    #[account(mut)]
    pub funder: Signer<'info>,

    pub system_program: Program<'info, System>,
}
