# FloofyChain wallet creation — compatibility research

Status: **research only**. No production key generation, seed import, or signing is enabled.

## Confirmed by FloofyChain developer (Discord, 2026-10-29)
- Core supports HD key derivation and BIP32-style derivation.
- Core does not currently support BIP39 12/24-word recovery or restoring from mnemonic words.
- Exact derivation path, address versions, WIF versions, and interoperability rules remain **unverified**.

## Protocol facts to verify from official Core source
1. Network prefixes for P2PKH/P2SH addresses and WIF keys, on mainnet and testnet.
2. Whether the Core uses secp256k1, compressed public keys, and Base58Check as expected; confirm by source, not analogy.
3. HD seed generation, master key serialization, BIP32 paths, hardened indices, and extended key version bytes.
4. Wallet import/export RPC support, descriptor/legacy wallet behavior, and whether imported keys are spendable.
5. Transaction format, sighash rules, fee/dust rules, change addresses, and UTXO discovery requirements.

## Safe verification approach
- Use a fresh, isolated Core data directory and a disposable **empty test wallet**. Never reuse the user's personal/faucet wallet or RPC credentials.
- Prefer testnet/regtest if supported. Do not send real coins to experimental addresses.
- Generate deterministic test vectors offline in an isolated test harness: private key -> public key -> address -> WIF -> import into disposable Core -> confirm ownership.
- Cross-check multiple fixed test vectors against official Core output; include compressed/uncompressed key cases if supported.
- Only after that, implement a browser-only, audited crypto module using Web Crypto for entropy and a vetted secp256k1 implementation. Never send secrets to backend or log them.
- Before production: secure storage, encryption, backup/recovery tests, threat model, independent review, and reproducible builds.

## Important architecture boundary
The existing localhost RPC backend is **read-only** and exposes a *Core wallet* summary, not a browser wallet. Do not connect browser-generated private keys to this backend. A public noncustodial wallet will require separate public-chain data access and local signing.

## Pending input from Andyd
- Official source code location/version and network parameters.
- Core HD derivation scheme and recovery compatibility expectations.
- Whether native BIP39 support will be added and, if so, how derivation will be specified.

## Exit criteria for wallet-generation implementation
Documented parameters, verified test vectors, successful disposable Core round-trip, and security review. Until then, Create/Import remain interface previews.
