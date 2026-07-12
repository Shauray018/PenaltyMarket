use anchor_lang::prelude::*;

use crate::state::*;
use crate::{AmmError, MarketType};

pub fn handler(
    ctx: Context<InitializeMarket>,
    fixture_id: u64,
    market_type: MarketType,
    options: Vec<String>,
    close_time: i64,
    initial_probabilities_bps: Vec<u16>,
    liquidity_parameter: u64,
    fee_bps: u16,
) -> Result<()> {
    require!(options.len() >= 2, AmmError::InvalidOptions);
    require!(options.len() <= MAX_OPTIONS, AmmError::InvalidOptions);
    require!(
        options
            .iter()
            .all(|option| option.as_bytes().len() <= MAX_OPTION_LEN),
        AmmError::OptionNameTooLong
    );
    require!(
        initial_probabilities_bps.len() == options.len(),
        AmmError::InvalidProbabilities
    );
    require!(liquidity_parameter > 0, AmmError::InvalidAmount);
    require!(fee_bps <= 1_000, AmmError::InvalidFee);

    let probability_sum: u64 = initial_probabilities_bps
        .iter()
        .map(|value| u64::from(*value))
        .sum();
    require!(probability_sum > 0, AmmError::InvalidProbabilities);

    let mut virtual_shares = Vec::with_capacity(options.len());
    for probability in initial_probabilities_bps {
        let share = (liquidity_parameter as u128)
            .checked_mul(probability as u128)
            .ok_or(AmmError::NumericOverflow)?
            .checked_div(probability_sum as u128)
            .ok_or(AmmError::NumericOverflow)?;
        virtual_shares.push(u64::try_from(share.max(1)).map_err(|_| AmmError::NumericOverflow)?);
    }

    let market = &mut ctx.accounts.market;
    market.fixture_id = fixture_id;
    market.market_type = market_type;
    market.outcome_shares = vec![0; options.len()];
    market.options = options;
    market.virtual_shares = virtual_shares;
    market.liquidity_deposited = 0;
    market.liquidity_withdrawn = 0;
    market.trader_collateral = 0;
    market.claims_paid = 0;
    market.fees_collected = 0;
    market.fee_bps = fee_bps;
    market.liquidity_parameter = liquidity_parameter;
    market.status = MarketStatus::Open;
    market.winning_outcome = u8::MAX;
    market.close_time = close_time;
    market.authority = ctx.accounts.authority.key();
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;

    let vault = &mut ctx.accounts.vault;
    vault.market = market.key();
    vault.bump = ctx.bumps.vault;

    Ok(())
}

#[derive(Accounts)]
#[instruction(fixture_id: u64, market_type: MarketType)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = AmmMarket::SPACE,
        seeds = [
            b"amm-market",
            fixture_id.to_le_bytes().as_ref(),
            &[market_type_seed(&market_type)],
        ],
        bump,
    )]
    pub market: Account<'info, AmmMarket>,

    #[account(
        init,
        payer = authority,
        space = AmmVault::SPACE,
        seeds = [b"amm-vault", market.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, AmmVault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn market_type_seed(market_type: &MarketType) -> u8 {
    match market_type {
        MarketType::MatchWinner => 0,
        MarketType::TotalGoals => 1,
        MarketType::TotalCorners => 2,
        MarketType::TotalYellowCards => 3,
        MarketType::BothTeamsScore => 4,
        MarketType::FirstYellowCard => 5,
    }
}
