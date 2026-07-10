use anchor_lang::prelude::*;

use crate::errors::MarketError;
use crate::state::*;
use crate::MarketType;

pub fn handler(
    ctx: Context<InitializeMarket>,
    fixture_id: u64,
    market_type: MarketType,
    options: Vec<String>,
    close_time: i64,
    team1_stat_key: u32,
    team2_stat_key: u32,
    stat_period: i32,
) -> Result<()> {
    require!(options.len() >= 2, MarketError::InvalidOutcome);
    require!(options.len() <= MAX_OPTIONS, MarketError::TooManyOutcomes);
    require!(
        options
            .iter()
            .all(|option| option.as_bytes().len() <= MAX_OPTION_LEN),
        MarketError::OutcomeNameTooLong
    );

    let market = &mut ctx.accounts.market;
    market.fixture_id = fixture_id;
    market.market_type = market_type;
    market.outcome_stakes = vec![0; options.len()];
    market.outcome_liabilities = vec![0; options.len()];
    market.options = options;
    market.total_staked = 0;
    market.total_reserved_liability = 0;
    market.liquidity_deposited = 0;
    market.liquidity_withdrawn = 0;
    market.status = MarketStatus::Open;
    market.winning_outcome = u8::MAX;
    market.close_time = close_time;
    market.authority = ctx.accounts.authority.key();
    market.team1_stat_key = team1_stat_key;
    market.team2_stat_key = team2_stat_key;
    market.stat_period = stat_period;
    market.resolved_ts = 0;
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
        space = Market::SPACE,
        seeds = [
            b"market",
            fixture_id.to_le_bytes().as_ref(),
            &[market_type_seed(&market_type)],
        ],
        bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        space = SolVault::SPACE,
        seeds = [b"vault", market.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, SolVault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn market_type_seed(mt: &MarketType) -> u8 {
    match mt {
        MarketType::MatchWinner => 0,
        MarketType::TotalGoals => 1,
        MarketType::TotalCorners => 2,
        MarketType::TotalYellowCards => 3,
        MarketType::BothTeamsScore => 4,
        MarketType::FirstYellowCard => 5,
    }
}
