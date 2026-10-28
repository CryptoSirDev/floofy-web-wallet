# Architecture — Phase 1

## Trust boundaries

1. **Browser (untrusted runtime):** UI and, in a later audited phase, locally generated/encrypted keys and local signing. Never send seeds, WIFs, private keys or passwords to the API.
2. **Restricted backend:** read-only address/UTXO/transaction endpoints plus a carefully validated raw-transaction broadcast endpoint later. It does **not** hold customer keys.
3. **FloofyChain Core node / indexed chain data:** authoritative network source. RPC credentials remain server-side and must not be public.

## Delivery

- **Phase 1a:** static UI scaffold and chain compatibility research.
- **Phase 1b:** read-only backend; explicit loading/error states; verify confirmed/unconfirmed balances, mempool changes, and reorgs against the node.
- **Phase 2:** address derivation and local signing using vetted libraries adapted to verified FloofyChain consensus rules, tested with published or independently generated vectors.
- **Phase 3:** testnet/regtest end-to-end transfers, transaction fees, change outputs, coin selection and recovery tests.
- **Phase 4:** external security review and cautious release.

## API sketch (NOT implemented)

- `GET /api/v1/addresses/:address/summary`
- `GET /api/v1/addresses/:address/utxos`
- `GET /api/v1/addresses/:address/transactions`
- `POST /api/v1/transactions/broadcast` — only after security review

All responses need chain tip height, freshness metadata, and explicit confirmed/unconfirmed status. A refresh action must perform a new request, bypass stale caches, and reconcile pending transactions.

## Deployment

Use TLS, strict CSP, pinned dependencies, monitored node sync, authentication and rate limiting where appropriate. Never expose node RPC to the public internet. Static frontend hosting alone is insufficient for production wallet operation.
