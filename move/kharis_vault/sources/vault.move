module kharis_vault::vault {
    use std::vector;
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::object::{Self, ID, UID};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const DAY_MS: u64 = 86400000;
    const BASIS_POINTS: u64 = 10000;
    const MIN_INACTIVITY_DAYS: u64 = 7;
    const MAX_PERIOD_DAYS: u64 = 3650;
    const MAX_BENEFICIARIES: u64 = 10;

    const E_NOT_OWNER: u64 = 0;
    const E_RELEASED: u64 = 1;
    const E_ALREADY_RELEASED: u64 = 2;
    const E_NOT_READY: u64 = 3;
    const E_INVALID_INACTIVITY: u64 = 4;
    const E_INVALID_GRACE: u64 = 5;
    const E_INVALID_BENEFICIARIES: u64 = 6;
    const E_PAYOUT_COMPLETE: u64 = 7;
    const E_ZERO_AMOUNT: u64 = 8;
    const E_INSUFFICIENT_BALANCE: u64 = 9;
    const E_DUPLICATE_BENEFICIARY: u64 = 10;

    public struct Vault has key {
        id: UID,
        owner: address,
        balance: Balance<SUI>,
        last_checkin_ms: u64,
        inactivity_period_ms: u64,
        grace_period_ms: u64,
        recipients: vector<address>,
        shares_bps: vector<u64>,
        released: bool,
        payout_complete: bool,
    }

    public struct VaultCreated has copy, drop {
        vault_id: ID,
        owner: address,
    }

    public struct ReleaseTriggered has copy, drop {
        vault_id: ID,
    }

    public struct VaultPaid has copy, drop {
        vault_id: ID,
        total_amount: u64,
    }

    public fun create_vault(
        recipients: vector<address>,
        shares_bps: vector<u64>,
        inactivity_days: u64,
        grace_days: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        validate_timing(inactivity_days, grace_days);
        validate_beneficiaries(&recipients, &shares_bps);

        let owner = tx_context::sender(ctx);
        let vault = Vault {
            id: object::new(ctx),
            owner,
            balance: balance::zero<SUI>(),
            last_checkin_ms: clock::timestamp_ms(clock),
            inactivity_period_ms: inactivity_days * DAY_MS,
            grace_period_ms: grace_days * DAY_MS,
            recipients,
            shares_bps,
            released: false,
            payout_complete: false,
        };

        event::emit(VaultCreated {
            vault_id: object::id(&vault),
            owner,
        });
        transfer::share_object(vault);
    }

    public fun deposit(vault: &mut Vault, coin: Coin<SUI>, ctx: &TxContext) {
        assert_owner(vault, ctx);
        assert_not_released(vault);
        balance::join(&mut vault.balance, coin::into_balance(coin));
    }

    #[allow(lint(self_transfer))]
    public fun withdraw(
        vault: &mut Vault,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert_owner(vault, ctx);
        assert_not_released(vault);
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(balance::value(&vault.balance) >= amount, E_INSUFFICIENT_BALANCE);

        let payout = balance::split(&mut vault.balance, amount);
        transfer::public_transfer(coin::from_balance(payout, ctx), tx_context::sender(ctx));
        vault.last_checkin_ms = clock::timestamp_ms(clock);
    }

    public fun check_in(vault: &mut Vault, clock: &Clock, ctx: &TxContext) {
        assert_owner(vault, ctx);
        assert_not_released(vault);
        vault.last_checkin_ms = clock::timestamp_ms(clock);
    }

    public fun set_timing(
        vault: &mut Vault,
        inactivity_days: u64,
        grace_days: u64,
        ctx: &TxContext,
    ) {
        assert_owner(vault, ctx);
        assert_not_released(vault);
        validate_timing(inactivity_days, grace_days);
        vault.inactivity_period_ms = inactivity_days * DAY_MS;
        vault.grace_period_ms = grace_days * DAY_MS;
    }

    public fun set_beneficiaries(
        vault: &mut Vault,
        recipients: vector<address>,
        shares_bps: vector<u64>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        assert_owner(vault, ctx);
        assert_not_released(vault);
        validate_beneficiaries(&recipients, &shares_bps);
        vault.recipients = recipients;
        vault.shares_bps = shares_bps;
        vault.last_checkin_ms = clock::timestamp_ms(clock);
    }

    #[allow(lint(self_transfer))]
    public fun close_vault(vault: Vault, ctx: &mut TxContext) {
        assert_owner(&vault, ctx);
        assert_not_released(&vault);

        let Vault {
            id,
            owner: _,
            balance: vault_balance,
            last_checkin_ms: _,
            inactivity_period_ms: _,
            grace_period_ms: _,
            recipients: _,
            shares_bps: _,
            released: _,
            payout_complete: _,
        } = vault;

        if (balance::value(&vault_balance) > 0) {
            transfer::public_transfer(
                coin::from_balance(vault_balance, ctx),
                tx_context::sender(ctx),
            );
        } else {
            balance::destroy_zero(vault_balance);
        };
        object::delete(id);
    }

    public fun trigger_release(vault: &mut Vault, clock: &Clock) {
        assert!(!vault.released, E_ALREADY_RELEASED);
        assert!(
            release_ready(
                vault.last_checkin_ms,
                vault.inactivity_period_ms,
                vault.grace_period_ms,
                clock::timestamp_ms(clock),
            ),
            E_NOT_READY,
        );

        vault.released = true;
        event::emit(ReleaseTriggered {
            vault_id: object::id(vault),
        });
    }

    public fun pay_all(vault: &mut Vault, ctx: &mut TxContext) {
        assert!(vault.released, E_RELEASED);
        assert!(!vault.payout_complete, E_PAYOUT_COMPLETE);

        let total = balance::value(&vault.balance);
        let count = vector::length(&vault.recipients);
        let mut remaining = balance::withdraw_all(&mut vault.balance);
        let mut index = 0;
        while (index < count) {
            let recipient = *vector::borrow(&vault.recipients, index);
            let amount = if (index + 1 == count) {
                balance::value(&remaining)
            } else {
                proportional_amount(total, *vector::borrow(&vault.shares_bps, index))
            };

            if (amount > 0) {
                let payout = balance::split(&mut remaining, amount);
                transfer::public_transfer(coin::from_balance(payout, ctx), recipient);
            };
            index = index + 1;
        };
        balance::destroy_zero(remaining);
        vault.payout_complete = true;
        event::emit(VaultPaid {
            vault_id: object::id(vault),
            total_amount: total,
        });
    }

    fun assert_owner(vault: &Vault, ctx: &TxContext) {
        assert!(vault.owner == tx_context::sender(ctx), E_NOT_OWNER);
    }

    fun assert_not_released(vault: &Vault) {
        assert!(!vault.released, E_RELEASED);
    }

    fun validate_timing(inactivity_days: u64, grace_days: u64) {
        assert!(
            inactivity_days >= MIN_INACTIVITY_DAYS && inactivity_days <= MAX_PERIOD_DAYS,
            E_INVALID_INACTIVITY,
        );
        assert!(grace_days <= MAX_PERIOD_DAYS, E_INVALID_GRACE);
    }

    fun validate_beneficiaries(recipients: &vector<address>, shares_bps: &vector<u64>) {
        let count = vector::length(recipients);
        assert!(
            count > 0 && count <= MAX_BENEFICIARIES && count == vector::length(shares_bps),
            E_INVALID_BENEFICIARIES,
        );

        let mut total = 0;
        let mut index = 0;
        while (index < count) {
            let share = *vector::borrow(shares_bps, index);
            assert!(share > 0, E_INVALID_BENEFICIARIES);
            total = total + share;

            let recipient = *vector::borrow(recipients, index);
            let mut previous = 0;
            while (previous < index) {
                assert!(
                    recipient != *vector::borrow(recipients, previous),
                    E_DUPLICATE_BENEFICIARY,
                );
                previous = previous + 1;
            };
            index = index + 1;
        };
        assert!(total == BASIS_POINTS, E_INVALID_BENEFICIARIES);
    }

    fun release_ready(
        last_checkin_ms: u64,
        inactivity_period_ms: u64,
        grace_period_ms: u64,
        now_ms: u64,
    ): bool {
        if (now_ms < last_checkin_ms) {
            false
        } else {
            let elapsed = now_ms - last_checkin_ms;
            elapsed >= inactivity_period_ms
                && elapsed - inactivity_period_ms >= grace_period_ms
        }
    }

    fun proportional_amount(total: u64, share_bps: u64): u64 {
        (total / BASIS_POINTS) * share_bps
            + ((total % BASIS_POINTS) * share_bps) / BASIS_POINTS
    }

    #[test_only]
    public fun test_release_ready(
        last_checkin_ms: u64,
        inactivity_period_ms: u64,
        grace_period_ms: u64,
        now_ms: u64,
    ): bool {
        release_ready(last_checkin_ms, inactivity_period_ms, grace_period_ms, now_ms)
    }

    #[test_only]
    public fun test_proportional_amount(total: u64, share_bps: u64): u64 {
        proportional_amount(total, share_bps)
    }

    #[test_only]
    public fun test_validate_beneficiaries(recipients: &vector<address>, shares_bps: &vector<u64>) {
        validate_beneficiaries(recipients, shares_bps)
    }
}
