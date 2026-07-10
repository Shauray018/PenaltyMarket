use anchor_lang::prelude::*;

use crate::errors::MarketError;
use crate::state::*;

pub fn handler(ctx: Context<UpdateMarketCloseTime>, new_close_time: i64) -> Result<()> {
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        MarketError::MarketNotOpen
    );
    require!(
        new_close_time > Clock::get()?.unix_timestamp,
        MarketError::InvalidCloseTime
    );

    ctx.accounts.market.close_time = new_close_time;

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateMarketCloseTime<'info> {
    #[account(
        mut,
        constraint = market.authority == authority.key() @ MarketError::UnauthorizedResolver
    )]
    pub market: Account<'info, Market>,

    pub authority: Signer<'info>,
}
