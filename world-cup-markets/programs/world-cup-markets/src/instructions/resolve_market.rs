use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::MarketError;

pub fn handler(
    ctx: Context<ResolveMarket>,
    winning_outcome: u8,
    _proof_data: Vec<u8>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(ctx.accounts.resolver.key() == market.resolver, MarketError::UnauthorizedResolver);
    require!(market.status != MarketStatus::Resolved, MarketError::AlreadyResolved);
    require!((winning_outcome as usize) < market.options.len(), MarketError::InvalidOutcome);

    market.status = MarketStatus::Resolved;
    market.winning_outcome = winning_outcome;

    msg!("Resolved: fixture={} winner={}", market.fixture_id, winning_outcome);
    Ok(())
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub resolver: Signer<'info>,
}