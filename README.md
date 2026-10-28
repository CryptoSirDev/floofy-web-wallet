# 🐹 FloofyChain Web Wallet

A community-driven, **non-custodial** web wallet project for FloofyChain, maintained by [CryptoSirDev](https://github.com/CryptoSirDev).

> 🚧 **Early development / Phase 1.** This repository is an architecture and UI scaffold, **not a working wallet**. Do not enter real seed phrases, private keys, or send funds using this project.

## Goals

- Keep private keys and signing entirely on the user's device.
- Display verified balances, UTXOs, and transaction history.
- Build and sign FloofyChain transactions locally (only after protocol compatibility and security testing).
- Use a narrow read/broadcast API; never expose a FloofyChain Core RPC endpoint to browsers.

## Current status

- [x] Project skeleton and static UI mockup
- [x] Architecture and security documentation
- [ ] Verify chain parameters and RPC capabilities against the official Core source
- [ ] Implement a read-only balance/UTXO/history API
- [ ] Test synchronization, pending transactions and reorg behavior
- [ ] Implement secure local key management and transaction signing
- [ ] Independent security review before any real-funds release

**Official chain source:** https://github.com/andyd1986/floofychain

## Development

Requires Node.js 20.19+ or 22.12+.

```bash
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite. The interface displays **illustrative data only** and does not connect to a wallet or blockchain.

## Project layout

- `frontend/` — React + TypeScript + Vite UI prototype
- `backend/` — reserved for a future restricted API (not implemented)
- `docs/architecture.md` — design and delivery stages
- `docs/security.md` — security requirements and threat model
- `docs/chain-research.md` — protocol verification checklist

## Contributions

Issues and carefully scoped pull requests are welcome. Do not submit secrets, wallet backups or real seed phrases.

No claim of affiliation with or endorsement by the FloofyChain maintainers is implied.
