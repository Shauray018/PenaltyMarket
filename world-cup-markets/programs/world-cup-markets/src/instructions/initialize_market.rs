use anchor_lang::prelude::*;
use crate::state::*;
use crate::MarketType;

pub fn handler(
    ctx: Context<InitializeMarket>,
    fixture_id: u64,
    market_type: MarketType,
    options: Vec<String>,
    close_time: i64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let num_options = options.len();

    market.fixture_id = fixture_id;
    market.market_type = market_type;
    market.options = options;
    market.outcome_pools = vec![0u64; num_options];
    market.total_pool = 0;
    market.status = MarketStatus::Open;
    market.winning_outcome = 255;
    market.close_time = close_time;
    market.resolver = ctx.accounts.resolver.key();
    market.bump = ctx.bumps.market;
    market.line = None;

    msg!("Market created: fixture={}", fixture_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(fixture_id: u64, market_type: MarketType)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = Market::MAX_SIZE,
        seeds = [
            b"market",
            fixture_id.to_le_bytes().as_ref(),
            &[market_type_seed(&market_type)],
        ],
        bump,
    )]
    pub market: Account<'info, Market>,

    /// CHECK: keeper pubkey stored for auth
    pub resolver: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn market_type_seed(mt: &MarketType) -> u8 {
    match mt {
        MarketType::MatchWinner      => 0,
        MarketType::TotalGoals       => 1,
        MarketType::TotalCorners     => 2,
        MarketType::TotalYellowCards => 3,
        MarketType::BothTeamsScore   => 4,
        MarketType::FirstYellowCard  => 5,
    }
}