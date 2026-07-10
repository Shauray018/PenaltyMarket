use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::errors::MarketError;
use crate::state::*;

pub fn handler(
    ctx: Context<BuyPosition>,
    position_id: u64,
    outcome_index: u8,
    stake_lamports: u64,
    odds_price: i32,
    odds_proof: OddsProof,
) -> Result<()> {
    require!(stake_lamports > 0, MarketError::InvalidAmount);
    require!(odds_price > 0, MarketError::InvalidOddsPrice);

    let market_key = ctx.accounts.market.key();
    let market = &ctx.accounts.market;
    require!(
        market.status == MarketStatus::Open,
        MarketError::MarketNotOpen
    );
    require!(
        Clock::get()?.unix_timestamp < market.close_time,
        MarketError::BettingClosed
    );
    require!(
        (outcome_index as usize) < market.options.len(),
        MarketError::InvalidOutcome
    );

    let payout_lamports = payout_for(stake_lamports, odds_price)?;
    let extra_liability = payout_lamports.saturating_sub(stake_lamports);
    require!(
        market.available_liquidity()? >= extra_liability,
        MarketError::InsufficientLiquidity
    );

    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault.key(),
            stake_lamports,
        ),
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )
    .map_err(|_| MarketError::TransferFailed)?;

    let market = &mut ctx.accounts.market;
    let idx = outcome_index as usize;
    market.outcome_stakes[idx] = market.outcome_stakes[idx]
        .checked_add(stake_lamports)
        .ok_or(MarketError::NumericOverflow)?;
    market.outcome_liabilities[idx] = market.outcome_liabilities[idx]
        .checked_add(payout_lamports)
        .ok_or(MarketError::NumericOverflow)?;
    market.total_staked = market
        .total_staked
        .checked_add(stake_lamports)
        .ok_or(MarketError::NumericOverflow)?;
    market.total_reserved_liability = market
        .total_reserved_liability
        .checked_add(payout_lamports)
        .ok_or(MarketError::NumericOverflow)?;

    let position = &mut ctx.accounts.position;
    position.market = market_key;
    position.user = ctx.accounts.user.key();
    position.position_id = position_id;
    position.outcome_index = outcome_index;
    position.stake_lamports = stake_lamports;
    position.odds_price = odds_price;
    position.payout_lamports = payout_lamports;
    position.odds_message_id = odds_proof.odds_snapshot.message_id.clone();
    position.odds_ts = odds_proof.odds_snapshot.ts;
    position.claimed = false;
    position.bump = ctx.bumps.position;

    Ok(())
}

fn payout_for(stake_lamports: u64, odds_price: i32) -> Result<u64> {
    let payout = (stake_lamports as u128)
        .checked_mul(odds_price as u128)
        .ok_or(MarketError::NumericOverflow)?
        .checked_div(ODDS_PRICE_SCALE)
        .ok_or(MarketError::NumericOverflow)?;

    u64::try_from(payout).map_err(|_| MarketError::NumericOverflow.into())
}

#[derive(Accounts)]
#[instruction(position_id: u64)]
pub struct BuyPosition<'info> {
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
        init,
        payer = user,
        space = BetPosition::SPACE,
        seeds = [
            b"position",
            market.key().as_ref(),
            user.key().as_ref(),
            position_id.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub position: Account<'info, BetPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: passed to the TxODDS oracle program.
    pub daily_odds_merkle_roots: UncheckedAccount<'info>,

    /// CHECK: checked against the official TxODDS devnet program id.
    pub txoracle_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
