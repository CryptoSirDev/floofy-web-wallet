// Experimental BIP39 research only. NEVER use with real FLOOF.
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { base58check } from '@scure/base';

// FloofyChain mainnet P2PKH prefix confirmed from chainparams.cpp.
// The coin type 666 is PROVISIONAL, not a published wallet standard.
export const EXPERIMENTAL_BIP39_COIN_TYPE = 666;
const base58 = base58check(sha256);
export const normalizeTestMnemonic = (phrase: string) => phrase.trim().toLowerCase().replace(/\s+/g, ' ');
export function createTestMnemonic() {
  return generateMnemonic(wordlist, 256); // 24 English words, browser CSPRNG
}
export function isValidTestMnemonic(phrase: string) {
  const normalized = normalizeTestMnemonic(phrase);
  return normalized.split(' ').length === 24 && validateMnemonic(normalized, wordlist);
}
export type TestDerivedAddress = { path: string; address: string };
export function deriveTestBip39Addresses(phrase: string, passphrase = '', count = 5): TestDerivedAddress[] {
  const normalized = normalizeTestMnemonic(phrase);
  if (!isValidTestMnemonic(normalized)) throw Error('Invalid 24-word test recovery phrase');
  if (!Number.isInteger(count) || count < 1 || count > 10) throw Error('Invalid address count');
  const seed = mnemonicToSeedSync(normalized, passphrase);
  try {
    const root = HDKey.fromMasterSeed(seed);
    const result: TestDerivedAddress[] = [];
    for (let i = 0; i < count; i++) {
      const path = `m/44'/${EXPERIMENTAL_BIP39_COIN_TYPE}'/0'/0/${i}`;
      const publicKey = root.derive(path).publicKey;
      if (!publicKey) throw Error('Missing derived public key');
      const payload = new Uint8Array(21);
      payload[0] = 35;
      payload.set(ripemd160(sha256(publicKey)), 1);
      result.push({ path, address: base58.encode(payload) });
    }
    return result;
  } finally {
    seed.fill(0);
  }
}
