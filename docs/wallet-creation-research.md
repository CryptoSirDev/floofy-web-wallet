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


## Official source inspection — 2026-10-29

Source: https://github.com/andyd1986/floofychain (main)

Mainnet `src/chainparams.cpp` defines:
- P2PKH Base58 version: decimal **35** (0x23)
- P2SH Base58 version: decimal **22** (0x16)
- WIF/SECRET_KEY Base58 version: decimal **163** (0xA3)
- Extended public-key version: **02 FA CA FD**
- Extended private-key version: **02 FA C3 98**

Testnet in the source currently defines P2PKH=35, P2SH=196, WIF=163; regtest uses P2PKH=111, P2SH=196, WIF=239. **Do not mix networks**.

The source uses Bitcoin-style `CBitcoinAddress`, `CBitcoinSecret`, Base58Check and `CKey` structures (`src/base58.h`, `src/key.h`). This supports interoperability research, but does not replace independent test vectors.

`src/wallet/wallet.cpp` in `CWallet::DeriveNewChildKey` has an important discrepancy:
- The implementation derives hardened path **m/0'/0'/k'** (external chain and hardened child index).
- The metadata string records **m/0'/3'/k'**, which does **not** match the executed derivation. Treat metadata derivation paths as potentially unreliable until confirmed by Andyd or fixed in Core.

### Before enabling creation/import
- Confirm the Core version running locally matches this source revision.
- Cross-check generated address and WIF with a brand-new disposable wallet and known deterministic test vectors.
- Obtain an explicit resolution of the HD keypath discrepancy.
- Confirm Core's private-key import support and verify compressed-key behavior.
- Never use private keys from the user's real Core wallet as test vectors; never disclose them in chat or GitHub.
