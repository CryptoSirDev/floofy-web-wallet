# Security policy and threat model

**Do not use this prototype with real funds.**

## Non-custodial guarantees

- Seed phrases and private keys must never leave the browser/device.
- Never log or transmit secrets to telemetry, analytics, support forms or server APIs.
- Encrypt locally stored key material with an audited KDF and authenticated encryption; define a secure recovery/backup procedure before enabling wallet creation.
- Browser storage and extensions are not inherently secure: explicitly consider XSS, compromised dependencies, malicious extensions, phishing, and supply-chain attacks.
- A web wallet cannot promise hardware-wallet-level isolation. Consider hardware-wallet integration only after verifying chain compatibility.

## Backend and chain data

- No public RPC endpoint or RPC credentials in frontend bundles.
- Validate addresses and raw transactions; enforce rate limits and request size limits.
- Treat third-party balance/indexer data as untrusted until cross-checked with the node.
- Handle unconfirmed transactions, chain reorganizations, and stale node state.

## Release gates

1. Confirm chain parameters and signature rules from official source.
2. Test on regtest/testnet; no mainnet funds.
3. Add automated tests for transaction construction, signing, fees and change.
4. Perform dependency, secret and security reviews.
5. Obtain an independent security audit before recommending use with funds.

Report vulnerabilities privately to the maintainer; do not post seed phrases or private keys in issues.
