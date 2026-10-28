# FloofyChain compatibility checklist

Source of truth: https://github.com/andyd1986/floofychain

**Unverified — do not hardcode assumptions.**

- [ ] Network magic, genesis hash, mainnet/testnet/regtest ports
- [ ] Address encodings: P2PKH, P2SH, WIF, Bech32 (if supported)
- [ ] HD key versions and derivation paths (if supported)
- [ ] Supported script types and signature hashing rules
- [ ] Transaction serialization, fee policy, dust rules, locktime, sequence and change
- [ ] UTXO query methods and indexing requirements (e.g. address index, external indexer)
- [ ] Raw transaction broadcast RPC and validation errors
- [ ] Confirmations, coinbase maturity, mempool and reorg handling
- [ ] Available testnet/regtest nodes and deterministic test vectors

Document every verified value with a source file path, line reference and Core version/commit before implementing signing.
