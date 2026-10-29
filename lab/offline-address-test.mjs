// Offline FloofyChain address-format laboratory.
// Uses PUBLIC, deliberately insecure deterministic test scalar 1.
// NEVER send funds to addresses derived from this test vector.
// No RPC, filesystem writes, external dependencies, or network access.
import { createECDH, createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const MAINNET = Object.freeze({ p2pkh: 35, p2sh: 22, wif: 163 });
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const sha256 = bytes => createHash('sha256').update(bytes).digest();
const hash160 = bytes => createHash('ripemd160').update(sha256(bytes)).digest();
function base58(bytes) {
  let n = BigInt('0x' + bytes.toString('hex'));
  let encoded = '';
  while (n > 0n) {
    const digit = Number(n % 58n);
    encoded = ALPHABET[digit] + encoded;
    n /= 58n;
  }
  for (const b of bytes) { if (b !== 0) break; encoded = '1' + encoded; }
  return encoded;
}
function base58check(version, payload) {
  const data = Buffer.concat([Buffer.from([version]), payload]);
  return base58(Buffer.concat([data, sha256(sha256(data)).subarray(0, 4)]));
}
function decode58check(text) {
  let n = 0n;
  for (const c of text) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw Error('Invalid Base58 character');
    n = n * 58n + BigInt(i);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const body = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
  const leadingZeros = text.match(/^1*/)?.[0].length ?? 0;
  const decoded = Buffer.concat([Buffer.alloc(leadingZeros), body]);
  if (decoded.length < 5) throw Error('Base58Check too short');
  const data = decoded.subarray(0, -4);
  assert.deepEqual(decoded.subarray(-4), sha256(sha256(data)).subarray(0, 4), 'Checksum mismatch');
  return { version: data[0], payload: data.subarray(1) };
}

// Scalar 1 is public, trivially guessable and NEVER suitable for a wallet.
const TEST_PRIVATE_KEY = Buffer.alloc(32);
TEST_PRIVATE_KEY[31] = 1;
const ecdh = createECDH('secp256k1');
ecdh.setPrivateKey(TEST_PRIVATE_KEY);
const publicKey = ecdh.getPublicKey(undefined, 'compressed');
assert.equal(publicKey.toString('hex'), '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');

const address = base58check(MAINNET.p2pkh, hash160(publicKey));
const wif = base58check(MAINNET.wif, Buffer.concat([TEST_PRIVATE_KEY, Buffer.from([0x01])]));
const addressDecoded = decode58check(address);
const wifDecoded = decode58check(wif);
assert.equal(addressDecoded.version, MAINNET.p2pkh);
assert.deepEqual(addressDecoded.payload, hash160(publicKey));
assert.equal(wifDecoded.version, MAINNET.wif);
assert.equal(wifDecoded.payload.length, 33);
assert.equal(wifDecoded.payload[32], 1);
assert.deepEqual(wifDecoded.payload.subarray(0, 32), TEST_PRIVATE_KEY);
assert.throws(() => decode58check(address.slice(0, -1) + (address.endsWith('1') ? '2' : '1')), /Checksum mismatch/);

console.log('PASS: secp256k1 compressed public key for published scalar 1');
console.log('PASS: FloofyChain mainnet P2PKH address Base58Check round-trip');
console.log('PASS: FloofyChain mainnet compressed WIF Base58Check round-trip');
console.log('PASS: corrupted address checksum rejected');
console.log('TEST-ONLY public address:', address);
console.log('No RPC used, no transaction signed, no funds moved.');
