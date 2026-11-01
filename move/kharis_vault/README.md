# Kharis Sui Move vault

This package is the Testnet-first SUI vault contract. It is published on Sui Testnet, but has not been audited and must not be used to custody real funds.

## Testnet deployment

- Package ID: `0x9c87cf7116c2302ee1ad8fe5903d4f4ce957656b0fbcf9718319e45c30855ed0`
- Publish transaction: `8EwV5jfFrTKLx1Z99XBdmmxBijBYyu7E2jJpPCNxyGNv`
- Network: Sui Testnet

The package object was verified on-chain after publication. The deployer received an `UpgradeCap`; preserve access to that wallet if package upgrades are needed. The frontend submits wallet-approved Testnet transactions against this package. This is not a Mainnet deployment and must not be used to custody valuable funds.

## Testnet wallet flows

The workspace includes flows for creating a vault, depositing native Testnet SUI, checking in, updating beneficiaries, triggering an eligible release, and paying all beneficiaries. Each transaction requires connected-wallet approval. Writes are disabled by default and unavailable in production; enable them only for local Testnet verification with `VITE_SUI_TESTNET_TRANSACTIONS_ENABLED=true`. No transaction is submitted automatically.

Vault creation requires 1–10 unique beneficiary addresses whose shares total exactly 10,000 basis points. The inactivity period is 7–3,650 days; the grace period is 0–3,650 days. Release cannot be triggered until both periods have elapsed on-chain. The UI countdown is informational; the contract's Sui clock is authoritative.

Shared vaults are discovered from `VaultCreated` events emitted by this package and read directly from Sui Testnet. If event indexing is delayed after creation, refresh the vault list.

## Rules

- The intended creation defaults are a 90-day inactivity window and a 14-day grace period. Creation accepts an explicit 7–3650-day inactivity window and a 0–3650-day grace period.
- The owner may check in, withdraw, change beneficiaries, deposit, or close the vault until a release is triggered. A check-in, withdrawal, or beneficiary change resets the timer. Depositing SUI and changing timing settings do not.
- Anyone may trigger release after both the inactivity window and grace period have elapsed. Until that transaction is executed, the owner can still act, including during the grace period.
- After release is triggered, vault configuration, deposits, withdrawals, and close are frozen. Anyone may call `pay_all`; beneficiaries do not need to sign or claim.
- Beneficiary shares are in basis points (10,000 = 100%), must total exactly 10,000, and are limited to 10 distinct addresses. Earlier recipients receive floored MIST amounts; the last recipient receives the remainder so no funds are stranded.
- The contract holds only native SUI. Walrus Memory is separate and is not used as a balance or release authority.

## Build and test

With the Sui CLI installed:

```sh
sui move build
sui move test
```

Run those commands from this package directory. The frontend now wires wallet-approved Testnet vault transactions. Continue validating each action on Testnet; the release flow cannot be exercised until the configured inactivity and grace periods have elapsed. Complete independent security review and end-to-end Testnet transaction testing before any Mainnet deployment. Mainnet vault transactions remain disabled.
