#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Env, Symbol, Address, Vec
};

#[derive(Clone)]
#[contracttype]
pub struct Escrow {
    pub payer: Address,
    pub receiver: Address,
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
        total_amount: i128,
        milestone_count: u32,
    ) {
        payer.require_auth();

        let mut milestones = Vec::new(&env);
        for _ in 0..milestone_count {
            milestones.push_back(false);
        }

        let escrow = Escrow {
            payer,
            receiver,
            total_amount,
            milestones,
            released: 0,
        };

        env.storage().instance().set(&id, &escrow);
    }

    pub fn complete_milestone(env: Env, id: Symbol, index: u32) {
        let mut escrow: Escrow = env.storage().instance().get(&id).unwrap();

        escrow.payer.require_auth();

        escrow.milestones.remove(index);
        escrow.milestones.insert(index, true);

        env.storage().instance().set(&id, &escrow);
    }

    pub fn release(env: Env, id: Symbol) {
        let mut escrow: Escrow = env.storage().instance().get(&id).unwrap();

        escrow.receiver.require_auth();

        let total = escrow.milestones.len();
        let mut completed: i128 = 0;

        for i in 0..total {
            if escrow.milestones.get(i).unwrap() {
                completed += 1;
            }
        }

        let releasable =
            (escrow.total_amount * completed) / total as i128;

        let to_release = releasable - escrow.released;

        if to_release > 0 {
            escrow.released += to_release;
        }

        env.storage().instance().set(&id, &escrow);
    }

    pub fn get_escrow(env: Env, id: Symbol) -> Escrow {
        env.storage().instance().get(&id).unwrap()
    }
}