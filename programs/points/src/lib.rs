use anchor_lang::prelude::*;
use std::mem::size_of;

declare_id!("B6ipmoRFoFVwKDfqjCoXGbkzGaQA6PXJGC1qVhWVMEuY");

const STARTING_POINTS: u32 = 10;

#[program]
pub mod points {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.player.points = STARTING_POINTS;
        ctx.accounts.player.authority = ctx.accounts.signer.key();
        msg!("Game Account for account {:?} succesfully initialized", ctx.accounts.signer.key());
        Ok(())
    }

    pub fn transfer_points(ctx: Context<TransferPoints>, amount: u32) -> Result<()> {
       /*  require!(ctx.accounts.from.authority == ctx.accounts.signer.key(), Errors::SignerIsNotAuthority);
        require!(ctx.accounts.from.points >= amount, Errors::InsufficientPoints); */ // This can be done using Anchor constraints, which is a macro



        ctx.accounts.from.points -= amount;
        ctx.accounts.to.points += amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init,
            payer = signer,
            space = size_of::<Player>() +8, // Space required for Player account + the 8 byte seed iterator
            seeds = [&(signer.as_ref().key().to_bytes())], // (Since there are multiple Player accounts, we derive the address of the signer through this way, so we can map it to its account address)
            bump)]
    player: Account<'info, Player>,
    #[account(mut)]
    signer: Signer<'info>,
    system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(amount:u32)]
pub struct TransferPoints<'info> {
    #[account(mut,
        has_one = authority @ Errors::SignerIsNotAuthority, // ensures that the signer of the tx is in fact allowed to send points from the account, otherwise throws an error
        constraint = from.points >= amount @ Errors::InsufficientPoints)] // ensures that the account has enough points, otherwise throws an error
    from: Account<'info, Player>,
    #[account(mut)]
    to: Account<'info, Player>,
    #[account(mut)]
    authority: Signer<'info>,
}


#[account]
pub struct Player {
    points: u32,
    authority: Pubkey
}


#[error_code]
pub enum Errors {
    #[msg("SignerIsNotAuthority")]
    SignerIsNotAuthority,
    #[msg("InsufficientPoints")]
    InsufficientPoints
}