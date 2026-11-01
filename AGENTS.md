# Project conventions

Inside AI Builder, platform rules are provided separately and always take precedence — they
cover the environment, credentials, networking, Tatum integration, design, verification, and
the parts of the layout that are fixed by the platform (the `server/index.mjs` entry point,
the inline Vite config, the wired-up styling). Do not restate or contradict them here.

<!-- <arch:exported-tooling-named-for-external-agents /> -->
Outside AI Builder, the Tatum tooling travels with this repository: the `tatum` and
`tatum-design` skills under `.claude/skills/`, and the `tatum-docs` MCP server in `.mcp.json`,
which Claude Code reads; another agent takes the same server URL in its own MCP config. Load
`tatum` before wiring blockchain data and `tatum-design` before writing UI. Those two skill
directories and `.mcp.json` are managed by AI Builder and rewritten on every start, so keep
your own skills under other names. Neither file holds a credential; the Tatum API key comes
from the server's environment, never from source.

This file describes what *this* app is and the choices made while building it.

## Stack

**React + TypeScript + Vite + Express** in the preview, with a Vercel static frontend and serverless API for external deployment:
- `server/index.mjs` — Express entry point with Vite in middleware mode (port 3000)
- `server/routes/` — API routes (Express)
- `src/` — React frontend (TypeScript, JSX)
- `api/` — Vercel serverless API entry points

## Conventions

- One Express process, one port (3000). No separate frontend dev server.
- Sui wallet connection and transaction signing happen in the browser through Sui dApp Kit.
- The public landing page lives at `/`; the persistent workspace shell is served at `/app` and its nested workspace paths.
- The SUI vault contract is in `move/kharis_vault/`; package `0x9c87cf7116c2302ee1ad8fe5903d4f4ce957656b0fbcf9718319e45c30855ed0` is published on Testnet. It is unaudited. Vault transactions require wallet approval, are Testnet-only, and are disabled in production builds; use test tokens only.
- Tatum Sui RPC reads run on the server; fetch from `/api/*` in the frontend. Never expose API keys in `VITE_*` variables.
- Set `MAINNET_TATUM_API_KEY` in the server environment for Tatum Sui Mainnet gRPC. The current documented Testnet reads use Sui's public gRPC endpoint; no Testnet Tatum endpoint is configured.
- On Vercel, set `VITE_WALRUS_MEMORY_ENABLED=true` to enable the user-owned Walrus Memory client. Users enter their own account ID and delegate key; the app keeps them in tab memory only. Use a current security-patched Node.js 24 runtime.
<!-- <arch:no-durable-storage-in-preview /> -->
- **No database, and no durable storage at runtime.** The project directory `/data` is mounted read-only in the preview container, so the running app cannot write the files it serves or persist anything there — no SQLite, no JSON files, no uploads. `/tmp` is writable, but it is ephemeral and local to this one container — wiped on every restart and never shared — so it does not give you persistence either. External databases are unreachable too: outbound traffic leaves only through an HTTP proxy, so a database wire protocol (MongoDB, Postgres) has no route out. Keep state in the browser or re-fetch it from Tatum. If the user asks for persistence, tell them it is not available in the preview rather than writing code that fails at runtime.
