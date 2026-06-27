use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, transfer, Transfer};
use crate::state::*;
use crate::errors::MarketError;

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let position = &mut ctx.accounts.bet_position;
    let market = &ctx.accounts.market;

    require!(market.status == MarketStatus::Resolved, MarketError::NotResolved);
    require!(!position.claimed, MarketError::AlreadyClaimed);
    require!(position.outcome_index == market.winning_outcome, MarketError::NotAWinner);

    let winning_pool = market.outcome_pools[market.winning_outcome as usize];
    let gross = (position.amount as u128)
        .checked_mul(market.total_pool as u128).unwrap()
        .checked_div(winning_pool as u128).unwrap() as u64;
    let fee = gross / 100;
    let payout = gross - fee;

    position.claimed = true;

    let market_key = market.key();
    let bump = ctx.bumps.vault_authority;
    let seeds: &[&[&[u8]]] = &[&[b"vault", market_key.as_ref(), &[bump]]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_usdc.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            seeds,
        ),
        payout,
    )?;

    msg!("Claimed: payout={} fee={}", payout, fee);
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = bet_position.bump,
        has_one = user,
    )]
    pub bet_position: Account<'info, BetPosition>,

    pub user: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = user_usdc.mint == mint.key() @ MarketError::InvalidAmount,
        constraint = user_usdc.owner == user.key() @ MarketError::InvalidAmount,
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault.mint == mint.key() @ MarketError::InvalidAmount,
        constraint = vault.owner == vault_authority.key() @ MarketError::InvalidAmount,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: PDA that owns the vault token account
    #[account(
        seeds = [b"vault", market.key().as_ref()],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}