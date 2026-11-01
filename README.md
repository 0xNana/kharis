# Kharis

Kharis is a Sui-based legacy-planning app for setting a vault check-in schedule and choosing beneficiaries. The public landing page is at `/`; the workspace is at `/app`.

## Current status

- The vault package is published on Sui Testnet. It has not been independently audited; never use real or valuable assets.
- Vault actions require wallet approval and are Testnet-only. They can be enabled for local development with `VITE_SUI_TESTNET_TRANSACTIONS_ENABLED=true`; production builds keep them disabled.
- Walrus Memory is in progress. When enabled, notes stay separate from the vault; the Walrus service can read note content before encryption. Do not save sensitive information.
- Mainnet vault actions are not available.

## Run locally

Requires Node.js 24.22.1 or newer and npm.

```sh
npm install
npm run dev
```

The app runs at `http://localhost:3000`. To check the frontend:

```sh
npm run typecheck
npm run build
```

To run the Move contract tests, install the Sui CLI and run:

```sh
sui move test --path move/kharis_vault
```

## Environment

Keep credentials in server-side environment variables, never in source control or `VITE_*` variables.

- `MAINNET_TATUM_API_KEY` enables Sui Mainnet balance reads through Tatum. Testnet reads use Sui's public gRPC endpoint.
- `VITE_WALRUS_MEMORY_ENABLED=true` enables the Walrus Memory experience at build time.
- `VITE_SUI_TESTNET_TRANSACTIONS_ENABLED=true` enables wallet-approved Testnet vault actions in local development only; it has no effect in production.

## Deployment

The frontend is built with Vite and the Sui API is served by Vercel functions in `api/`. Connect this GitHub repository to Vercel and configure any required environment variables in the Vercel project settings. Do not deploy the vault to Mainnet before an independent audit and complete Testnet transaction testing.
