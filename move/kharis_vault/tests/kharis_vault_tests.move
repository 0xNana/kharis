#[test_only]
module kharis_vault::kharis_vault_tests;

use kharis_vault::vault::{
    test_proportional_amount,
    test_release_ready,
    test_validate_beneficiaries,
};

#[test]
fun release_waits_for_inactivity_and_grace() {
    assert!(!test_release_ready(100, 50, 20, 169), 0);
    assert!(test_release_ready(100, 50, 20, 170), 1);
    assert!(!test_release_ready(100, 50, 20, 99), 2);
}

#[test]
fun proportional_amount_handles_large_values_without_overflow() {
    assert!(test_proportional_amount(101, 3333) == 33, 0);
    assert!(test_proportional_amount(18446744073709551615, 10000) == 18446744073709551615, 1);
}

#[test]
fun final_beneficiary_receives_rounding_remainder() {
    let total = 101;
    let first = test_proportional_amount(total, 3333);
    let second = test_proportional_amount(total, 3333);
    let last = total - first - second;
    assert!(first + second + last == total, 0);
    assert!(last == 35, 1);
}

#[test]
fun accepts_valid_beneficiary_shares() {
    test_validate_beneficiaries(&vector[@0x1, @0x2, @0x3], &vector[6000, 2000, 2000]);
}

#[test, expected_failure(abort_code = 6)]
fun rejects_shares_that_do_not_total_one_hundred_percent() {
    test_validate_beneficiaries(&vector[@0x1, @0x2], &vector[6000, 3000]);
}

#[test, expected_failure(abort_code = 10)]
fun rejects_duplicate_beneficiary_addresses() {
    test_validate_beneficiaries(&vector[@0x1, @0x1], &vector[5000, 5000]);
}
