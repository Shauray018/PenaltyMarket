use anchor_lang::prelude::*;

declare_id!("FtZqhiURxtcUX5cV2SoWkD8oeEsCXLmkMfU348JS6jKW");

#[program]
pub mod world_cup_markets {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
