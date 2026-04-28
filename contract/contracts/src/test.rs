#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{Env, Symbol, Address};

    #[test]
    fn test_create() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);

        client.create_escrow(
            &Symbol::short("esc1"),
            &payer,
            &receiver,
            &1000,
            &3,
        );

        let esc = client.get_escrow(&Symbol::short("esc1"));
        assert_eq!(esc.total_amount, 1000);
    }

    #[test]
    fn test_milestone() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EscrowContract);
        let client = EscrowContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let receiver = Address::generate(&env);

        client.create_escrow(
            &Symbol::short("esc1"),
            &payer,
            &receiver,
            &1000,
            &2,
        );

        client.complete_milestone(&Symbol::short("esc1"), &0);

        let esc = client.get_escrow(&Symbol::short("esc1"));
        assert_eq!(esc.milestones.get(0).unwrap(), true);
    }
}