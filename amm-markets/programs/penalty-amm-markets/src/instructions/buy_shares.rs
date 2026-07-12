use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::state::*;
use crate::AmmError;

pub fn handler(
    ctx: Context<BuyShares>,
    position_id: u64,
    outcome_index: u8,
    shares: u64,
    max_cost_lamports: u64,
) -> Result<()> {
    require!(shares > 0, AmmError::InvalidAmount);

    let market_key = ctx.accounts.market.key();
    let market = &ctx.accounts.market;
    require!(market.status == MarketStatus::Open, AmmError::MarketNotOpen);
    require!(
        Clock::get()?.unix_timestamp < market.close_time,
        AmmError::BettingClosed
    );
    require!(
        (outcome_index as usize) < market.options.len(),
        AmmError::InvalidOutcome
    );

    let cost_lamports = market.quote_buy_exact_shares(outcome_index as usize, shares)?;
    require!(
        cost_lamports <= max_cost_lamports,
        AmmError::SlippageExceeded
    );

    let new_outcome_shares = market.outcome_shares[outcome_index as usize]
        .checked_add(shares)
        .ok_or(AmmError::NumericOverflow)?;
    let new_trader_collateral = market
        .trader_collateral
        .checked_add(cost_lamports)
        .ok_or(AmmError::NumericOverflow)?;
    let mut max_liability = new_outcome_shares;
    for (index, value) in market.outcome_shares.iter().enumerate() {
        if index != outcome_index as usize {
            max_liability = max_liability.max(*value);
        }
    }
    let post_trade_collateral = market
        .liquidity_deposited
        .checked_add(new_trader_collateral)
        .and_then(|value| value.checked_sub(market.liquidity_withdrawn))
        .ok_or(AmmError::NumericOverflow)?;
    require!(
        post_trade_collateral >= max_liability,
        AmmError::InsufficientLiquidity
    );

    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.vault.key(),
            cost_lamports,
        ),
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )
    .map_err(|_| AmmError::TransferFailed)?;

    let market = &mut ctx.accounts.market;
    market.outcome_shares[outcome_index as usize] = new_outcome_shares;
    market.trader_collateral = new_trader_collateral;
    let gross_without_fee = cost_lamports
        .checked_mul(10_000u64)
        .and_then(|value| value.checked_div(10_000u64 + u64::from(market.fee_bps)))
        .unwrap_or(cost_lamports);
    market.fees_collected = market
        .fees_collected
        .checked_add(cost_lamports.saturating_sub(gross_without_fee))
        .ok_or(AmmError::NumericOverflow)?;

    let position = &mut ctx.accounts.position;
    position.market = market_key;
    position.user = ctx.accounts.user.key();
    position.position_id = position_id;
    position.outcome_index = outcome_index;
    position.shares = shares;
    position.cost_lamports = cost_lamports;
    position.claimed = false;
    position.bump = ctx.bumps.position;

    Ok(())
}

#[derive(Accounts)]
#[instruction(position_id: u64)]
pub struct BuyShares<'info> {
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
        init,
        payer = user,
        space = AmmPosition::SPACE,
        seeds = [
            b"amm-position",
            market.key().as_ref(),
            user.key().as_ref(),
            position_id.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub position: Account<'info, AmmPosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}
