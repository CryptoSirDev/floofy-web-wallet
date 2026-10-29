// Experimental, ephemeral single-key FloofyChain wallet. NOT for real funds.
// All operations happen locally in the browser. No RPC, network requests or storage.
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function concat(...parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}
function base58(bytes: Uint8Array) {
  let n = BigInt('0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''));
  let result = '';
  while (n > 0n) { result = alphabet[Number(n % 58n)] + result; n /= 58n; }
  for (const byte of bytes) { if (byte !== 0) break; result = '1' + result; }
  return result;
}
function check(version: number, payload: Uint8Array) {
  const data = concat(new Uint8Array([version]), payload);
  return base58(concat(data, sha256(sha256(data)).slice(0, 4)));
}
export function createEphemeralWallet() {
  const privateKey = secp256k1.utils.randomPrivateKey();
  try {
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    const address = check(35, ripemd160(sha256(publicKey)));
    const wif = check(163, concat(privateKey, new Uint8Array([1])));
    return { address, wif };
  } finally {
    privateKey.fill(0);
  }
}
