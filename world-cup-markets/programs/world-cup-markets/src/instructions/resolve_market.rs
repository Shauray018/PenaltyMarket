use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};

use crate::errors::MarketError;
use crate::state::*;
use crate::{BinaryExpression, Comparison, MarketType};

const VALIDATE_STAT_DISCRIMINATOR: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];

pub fn handler(
    ctx: Context<ResolveMarket>,
    winning_outcome: u8,
    score_proof: ScoreProof,
) -> Result<()> {
    require!(
        ctx.accounts.txoracle_program.key() == TXORACLE_DEVNET_PROGRAM_ID,
        MarketError::InvalidOracleProgram
    );

    let market = &ctx.accounts.market;
    require!(
        ctx.accounts.authority.key() == market.authority,
        MarketError::UnauthorizedResolver
    );
    require!(
        market.status != MarketStatus::Resolved,
        MarketError::AlreadyResolved
    );
    require!(
        market.status != MarketStatus::Cancelled,
        MarketError::NotRefundable
    );
    require!(
        (winning_outcome as usize) < market.options.len(),
        MarketError::InvalidOutcome
    );
    require!(
        market.market_type == MarketType::MatchWinner,
        MarketError::InvalidOutcome
    );

    validate_score_payload(market, winning_outcome, &score_proof)?;
    invoke_validate_stat(&ctx, &score_proof)?;

    let market = &mut ctx.accounts.market;
    market.status = MarketStatus::Resolved;
    market.winning_outcome = winning_outcome;
    market.total_reserved_liability = market.outcome_liabilities[winning_outcome as usize];
    market.resolved_ts = Clock::get()?.unix_timestamp;

    Ok(())
}

fn validate_score_payload(market: &Market, winning_outcome: u8, proof: &ScoreProof) -> Result<()> {
    require!(
        proof.fixture_summary.fixture_id == market.fixture_id as i64,
        MarketError::InvalidScoreProof
    );
    require!(
        proof.predicate.threshold == 0,
        MarketError::InvalidScoreProof
    );
    require!(
        proof.stat_a.stat_to_prove.key == market.team1_stat_key,
        MarketError::InvalidScoreProof
    );
    require!(
        proof.stat_a.stat_to_prove.period == market.stat_period,
        MarketError::InvalidScoreProof
    );

    let stat_b = proof
        .stat_b
        .as_ref()
        .ok_or(MarketError::InvalidScoreProof)?;
    require!(
        stat_b.stat_to_prove.key == market.team2_stat_key,
        MarketError::InvalidScoreProof
    );
    require!(
        stat_b.stat_to_prove.period == market.stat_period,
        MarketError::InvalidScoreProof
    );
    require!(
        proof.op == Some(BinaryExpression::Subtract),
        MarketError::InvalidScoreProof
    );

    let expected = match winning_outcome {
        0 => Comparison::GreaterThan,
        1 => Comparison::EqualTo,
        2 => Comparison::LessThan,
        _ => return err!(MarketError::InvalidOutcome),
    };
    require!(
        proof.predicate.comparison == expected,
        MarketError::InvalidScoreProof
    );

    Ok(())
}

fn invoke_validate_stat(ctx: &Context<ResolveMarket>, proof: &ScoreProof) -> Result<()> {
    let mut data = VALIDATE_STAT_DISCRIMINATOR.to_vec();
    proof.ts.serialize(&mut data)?;
    proof.fixture_summary.serialize(&mut data)?;
    proof.fixture_proof.serialize(&mut data)?;
    proof.main_tree_proof.serialize(&mut data)?;
    proof.predicate.serialize(&mut data)?;
    proof.stat_a.serialize(&mut data)?;
    proof.stat_b.serialize(&mut data)?;
    proof.op.serialize(&mut data)?;

    let ix = Instruction {
        program_id: ctx.accounts.txoracle_program.key(),
        accounts: vec![AccountMeta::new_readonly(
            ctx.accounts.daily_scores_merkle_roots.key(),
            false,
        )],
        data,
    };

    invoke(
        &ix,
        &[
            ctx.accounts.daily_scores_merkle_roots.to_account_info(),
            ctx.accounts.txoracle_program.to_account_info(),
        ],
    )
    .map_err(|_| MarketError::InvalidScoreProof)?;

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    pub authority: Signer<'info>,

    /// CHECK: passed to the TxODDS oracle program.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,

    /// CHECK: checked against the official TxODDS devnet program id.
    pub txoracle_program: UncheckedAccount<'info>,
}
