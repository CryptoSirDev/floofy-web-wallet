// FloofyChain test-only address batch. All private scalars are PUBLIC and guessable.
// Never send FLOOF to these addresses. Not a wallet backup or a production generator.
// No network, RPC, file writes, signing, or transfers.
import assert from 'node:assert/strict';
import { createECDH, createHash } from 'node:crypto';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const sha256 = b => createHash('sha256').update(b).digest();
const hash160 = b => createHash('ripemd160').update(sha256(b)).digest();
function encode58(bytes) {
  let n = BigInt('0x' + bytes.toString('hex'));
  let result = '';
  while (n > 0n) {
    result = ALPHABET[Number(n % 58n)] + result;
    n /= 58n;
  }
  for (const b of bytes) { if (b !== 0) break; result = '1' + result; }
  return result;
}
function decode58(text) {
  let n = 0n;
  for (const c of text) {
    const index = ALPHABET.indexOf(c);
    if (index < 0) throw Error('Invalid Base58');
    n = n * 58n + BigInt(index);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return Buffer.concat([Buffer.alloc((text.match(/^1*/)?.[0] ?? '').length), n ? Buffer.from(hex, 'hex') : Buffer.alloc(0)]);
}
function encodeCheck(version, payload) {
  const data = Buffer.concat([Buffer.from([version]), payload]);
  return encode58(Buffer.concat([data, sha256(sha256(data)).subarray(0, 4)]));
}
function assertCheck(text, version, payload) {
  const raw = decode58(text);
  const body = raw.subarray(0, -4);
  assert.equal(body[0], version);
  assert.deepEqual(body.subarray(1), payload);
  assert.deepEqual(raw.subarray(-4), sha256(sha256(body)).subarray(0, 4));
}

console.log('FloofyChain — PUBLIC, DISPOSABLE TEST VECTORS');
console.log('WARNING: Never send FLOOF to these addresses. Anyone can derive the keys.');
for (const scalar of [2, 3, 4]) {
  const privateKey = Buffer.alloc(32);
  privateKey[31] = scalar;
  const key = createECDH('secp256k1');
  key.setPrivateKey(privateKey);
  const publicKey = key.getPublicKey(undefined, 'compressed');
  const publicHash = hash160(publicKey);
  const address = encodeCheck(35, publicHash);
  const wifPayload = Buffer.concat([privateKey, Buffer.from([1])]);
  const wif = encodeCheck(163, wifPayload);
  assertCheck(address, 35, publicHash);
  assertCheck(wif, 163, wifPayload);
  console.log('PASS — test vector ' + scalar + ' — ' + address);
  privateKey.fill(0);
  wifPayload.fill(0);
}
console.log('PASS — 3 public test vectors. No RPC, private keys printed, or transactions.');
