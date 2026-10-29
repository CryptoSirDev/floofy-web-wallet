// FloofyChain experimental single-key wallet creator.
// LOCAL LAB ONLY. NEVER FUND THESE EXPERIMENTAL ADDRESSES.
// No RPC, network, files, transactions or signing.
// WIF printed to local terminal: anyone seeing it controls the address.
import { createECDH, createHash, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const sha = b => createHash('sha256').update(b).digest();
const hash160 = b => createHash('ripemd160').update(sha(b)).digest();
function encode58(data) {
  let n = BigInt('0x' + data.toString('hex'));
  let out = '';
  while (n > 0n) { out = alphabet[Number(n % 58n)] + out; n /= 58n; }
  for (const byte of data) { if (byte !== 0) break; out = '1' + out; }
  return out;
}
function decode58(value) {
  let n = 0n;
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw Error('Invalid Base58');
    n = n * 58n + BigInt(digit);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return Buffer.concat([Buffer.alloc((value.match(/^1*/)?.[0] ?? '').length), n ? Buffer.from(hex, 'hex') : Buffer.alloc(0)]);
}
function encodeCheck(version, payload) {
  const data = Buffer.concat([Buffer.from([version]), payload]);
  return encode58(Buffer.concat([data, sha(sha(data)).subarray(0, 4)]));
}
function decodeCheck(value) {
  const raw = decode58(value);
  if (raw.length < 5) throw Error('Too short');
  const body = raw.subarray(0, -4);
  if (!sha(sha(body)).subarray(0, 4).equals(raw.subarray(-4))) throw Error('Invalid checksum');
  return { version: body[0], payload: body.subarray(1) };
}
function addressFor(key) {
  const ecdh = createECDH('secp256k1');
  ecdh.setPrivateKey(key);
  return encodeCheck(35, hash160(ecdh.getPublicKey(undefined, 'compressed')));
}
function restoreAddress(wif) {
  const { version, payload } = decodeCheck(wif);
  if (version !== 163 || payload.length !== 33 || payload[32] !== 1) throw Error('Invalid compressed FloofyChain WIF');
  const key = Buffer.from(payload.subarray(0, 32));
  try { return addressFor(key); }
  finally { key.fill(0); }
}
let privateKey;
for (;;) {
  const candidate = randomBytes(32);
  try { const probe = createECDH('secp256k1'); probe.setPrivateKey(candidate); privateKey = candidate; break; }
  catch { candidate.fill(0); }
}
const payload = Buffer.concat([privateKey, Buffer.from([1])]);
const wif = encodeCheck(163, payload);
const address = addressFor(privateKey);
assert.equal(restoreAddress(wif), address);
privateKey.fill(0);
payload.fill(0);
console.log('');
console.log('FLOOFYCHAIN EXPERIMENTAL SINGLE-KEY WALLET — LOCAL ONLY');
console.log('PASS: cryptographically random secp256k1 private key generated');
console.log('PASS: address recovered from WIF without Core');
console.log('');
console.log('PUBLIC ADDRESS: ' + address);
console.log('PRIVATE WIF (SECRET — NEVER SHARE): ' + wif);
console.log('');
console.log('WARNING: DO NOT SEND FLOOF TO THIS EXPERIMENTAL ADDRESS.');
console.log('This is NOT a complete wallet: no encrypted storage, HD recovery, balance, or signing.');
console.log('WIF is exposed in terminal output; protect your screen and scrollback.');
console.log('Do not post a screenshot containing the WIF, upload it, or paste it into chat.');
console.log('No RPC, no network, no funds moved.');
