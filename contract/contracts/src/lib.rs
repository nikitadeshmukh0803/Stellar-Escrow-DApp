#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token, Env, Symbol, Address, Vec
};

#[derive(Clone)]
#[contracttype]
pub struct Escrow {
    pub payer: Address,
    pub receiver: Address,
    pub token: Address,
    pub total_amount: i128,
    pub milestones: Vec<bool>,
    pub released: i128,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {

    pub fn create_escrow(
        env: Env,
        id: Symbol,
        payer: Address,
        receiver: Address,
        token: Address,
        total_amount: i128,
        milestone_count: u32,
    ) {
        payer.require_auth();

        // Transfer tokens from payer into this contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(
            &payer,
            &env.current_contract_address(),
            &total_amount,
        );

        let mut milestones = Vec::new(&env);
        for _ in 0..milestone_count {
            milestones.push_back(false);
        }

        let escrow = Escrow {
            payer,
            receiver,
            token,
            total_amount,
            milestones,
            released: 0,
        };

        env.storage().instance().set(&id, &escrow);
    }

    pub fn complete_milestone(env: Env, id: Symbol, index: u32) {
        let mut escrow: Escrow = env.storage().instance().get(&id).unwrap();
        escrow.payer.require_auth();

        assert!(index < escrow.milestones.len(), "index out of bounds");

        let mut new_milestones = Vec::new(&env);
        for i in 0..escrow.milestones.len() {
            if i == index {
                new_milestones.push_back(true);
            } else {
                new_milestones.push_back(escrow.milestones.get(i).unwrap());
            }
        }

        escrow.milestones = new_milestones;
        env.storage().instance().set(&id, &escrow);
    }

    pub fn release(env: Env, id: Symbol) {
        let mut escrow: Escrow = env.storage().instance().get(&id).unwrap();
        escrow.receiver.require_auth();

        let total = escrow.milestones.len() as i128;
        let mut completed: i128 = 0;

        for i in 0..escrow.milestones.len() {
            if escrow.milestones.get(i).unwrap() {
                completed += 1;
            }
        }

        let releasable = (escrow.total_amount * completed) / total;
        let to_release = releasable - escrow.released;

        if to_release <= 0 {
            return;
        }

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.receiver,
            &to_release,
        );

        escrow.released += to_release;
        env.storage().instance().set(&id, &escrow);
    }

    pub fn cancel_escrow(env: Env, id: Symbol) {
        let escrow: Escrow = env.storage().instance().get(&id).unwrap();
        escrow.payer.require_auth();

        let remaining = escrow.total_amount - escrow.released;

        if remaining > 0 {
            let token_client = token::Client::new(&env, &escrow.token);
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.payer,
                &remaining,
            );
        }

        env.storage().instance().remove(&id);
    }

    pub fn get_escrow(env: Env, id: Symbol) -> Escrow {
        env.storage().instance().get(&id).unwrap()
    }
}