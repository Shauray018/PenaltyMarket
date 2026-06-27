use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, transfer, Transfer};
use crate::state::*;
use crate::errors::MarketError;

pub fn handler(
    ctx: Context<PlaceBet>,
    outcome_index: u8,
    amount: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    require!(market.status == MarketStatus::Open, MarketError::MarketNotOpen);
    require!(clock.unix_timestamp < market.close_time, MarketError::BettingClosed);
    require!((outcome_index as usize) < market.options.len(), MarketError::InvalidOutcome);
    require!(amount > 0, MarketError::InvalidAmount);

    transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.user_usdc.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    market.outcome_pools[outcome_index as usize] += amount;
    market.total_pool += amount;

    let pos = &mut ctx.accounts.bet_position;
    pos.market = market.key();
    pos.user = ctx.accounts.user.key();
    pos.outcome_index = outcome_index;
    pos.amount = amount;
    pos.claimed = false;
    pos.bump = ctx.bumps.bet_position;

    msg!("Bet: outcome={} amount={}", outcome_index, amount);
    Ok(())
}

#[derive(Accounts)]
#[instruction(outcome_index: u8, amount: u64)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = user,
        space = BetPosition::SIZE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub bet_position: Account<'info, BetPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = user_usdc.mint == mint.key() @ MarketError::InvalidAmount,
        constraint = user_usdc.owner == user.key() @ MarketError::InvalidAmount,
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    /// Vault token account owned by vault_authority PDA
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
    pub system_program: Program<'info, System>,
}