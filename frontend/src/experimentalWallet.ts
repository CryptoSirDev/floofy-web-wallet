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

function decode58(text: string): Uint8Array {
  if (!text || text.length > 128) throw new Error('Invalid WIF length');
  let n = 0n;
  for (const char of text) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid Base58 character');
    n = n * 58n + BigInt(digit);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const bytes = n === 0n ? new Uint8Array() : new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const zeros = (text.match(/^1*/)?.[0] ?? '').length;
  return concat(new Uint8Array(zeros), bytes);
}
export function restoreExperimentalAddress(wif: string): string {
  const raw = decode58(wif);
  if (raw.length !== 38) throw new Error('Invalid compressed WIF length');
  const body = raw.slice(0, -4);
  const expected = sha256(sha256(body)).slice(0, 4);
  if (!expected.every((byte, i) => byte === raw[raw.length - 4 + i])) throw new Error('Invalid WIF checksum');
  if (body[0] !== 163 || body[33] !== 1) throw new Error('Not a FloofyChain mainnet compressed WIF');
  const privateKey = body.slice(1, 33);
  try {
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    return check(35, ripemd160(sha256(publicKey)));
  } finally {
    privateKey.fill(0);
    body.fill(0);
    raw.fill(0);
  }
}
