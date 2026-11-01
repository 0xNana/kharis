# Kharis

Kharis is a Sui-based legacy-planning app. Create a vault, set a check-in schedule, and choose beneficiaries. Walrus Memory is in progress and will keep notes separate from the vault.

**Status:** Sui Testnet. The vault contract has not been independently audited. Do not use real or valuable assets.

## Features

- Connect a Sui wallet and view its address and SUI balance.
- Create and manage a Testnet vault, check in, and set beneficiary shares.
- Review the published [Sui Testnet contract](https://suiscan.xyz/testnet/object/0x9c87cf7116c2302ee1ad8fe5903d4f4ce957656b0fbcf9718319e45c30855ed0).
- Explore the Walrus Memory experience as it is developed.

Vault transactions require wallet approval, are Testnet-only, and are disabled in production builds. Mainnet vault actions are unavailable. Never deposit valuable assets.

## Tech stack

- React, TypeScript, and Vite
- Express API for local development
- Sui dApp Kit and Move
- Vercel static deployment and serverless API
- Walrus Memory

## Getting started

Requirements: Node.js 24.22.1 or later, npm, and a Sui-compatible browser wallet for wallet features.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page is `/`; the app is at `/app`.

## Configuration

Set environment variables in your local environment or deployment settings. Do not commit credentials or expose API keys through `VITE_*` variables.

| Variable | Purpose |
| --- | --- |
| `MAINNET_TATUM_API_KEY` | Enables Sui Mainnet balance reads through Tatum. |
| `VITE_WALRUS_MEMORY_ENABLED=true` | Enables the Walrus Memory experience at build time. |
| `VITE_SUI_TESTNET_TRANSACTIONS_ENABLED=true` | Enables wallet-approved Testnet vault actions during local development only. Production builds keep vault actions disabled. |

Testnet balance reads use Sui's public gRPC endpoint. Walrus services may read note content before encryption; do not save sensitive information.

## Development

```bash
npm run typecheck
npm run build
sui move test --path move/kharis_vault
```

The Sui CLI is required to build or test the Move package.

## Deployment

The frontend is built with Vite. Vercel serves the static site and API functions; the Vercel project should use Node.js 24 and have any required server-side environment variables configured in its project settings.

The vault contract is Testnet-only and unaudited. Complete an independent security audit and thorough Testnet transaction testing before considering any Mainnet deployment.
