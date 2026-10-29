// FloofyChain offline WIF recovery demo. ONLY uses deliberately public scalar 2.
// NEVER use real WIFs here; never send FLOOF to these test addresses.
// No Core RPC, network, file writes, signing, or transactions.
import assert from 'node:assert/strict';
import { createECDH, createHash } from 'node:crypto';
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const sha = b => createHash('sha256').update(b).digest();
const hash160 = b => createHash('ripemd160').update(sha(b)).digest();
function b58encode(bytes) {
  let n = BigInt('0x' + bytes.toString('hex'));
  let result = '';
  while (n > 0n) { result = ALPHABET[Number(n % 58n)] + result; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; result = '1' + result; }
  return result;
}
function b58decode(str) {
  let n = 0n;
  for (const c of str) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error('Invalid Base58 character');
    n = n * 58n + BigInt(i);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  return Buffer.concat([Buffer.alloc((str.match(/^1*/)?.[0] ?? '').length), n === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex')]);
}
function encodeCheck(version, payload) {
  const data = Buffer.concat([Buffer.from([version]), payload]);
  return b58encode(Buffer.concat([data, sha(sha(data)).subarray(0, 4)]));
}
function decodeCheck(str) {
  const decoded = b58decode(str);
  if (decoded.length < 5) throw new Error('Too short');
  const data = decoded.subarray(0, -4);
  if (!sha(sha(data)).subarray(0, 4).equals(decoded.subarray(-4))) throw new Error('Checksum mismatch');
  return { version: data[0], payload: data.subarray(1) };
}
function addressFromKey(privateKey, compressed) {
  const key = createECDH('secp256k1');
  key.setPrivateKey(privateKey);
  const pub = key.getPublicKey(undefined, compressed ? 'compressed' : 'uncompressed');
  return encodeCheck(35, hash160(pub));
}
function recoverAddressFromWif(wif) {
  const decoded = decodeCheck(wif);
  if (decoded.version !== 163) throw new Error('Wrong FloofyChain mainnet WIF version');
  const compressed = decoded.payload.length === 33 && decoded.payload[32] === 1;
  if (!compressed && decoded.payload.length !== 32) throw new Error('Invalid WIF payload');
  const privateKey = Buffer.from(decoded.payload.subarray(0, 32));
  try { return addressFromKey(privateKey, compressed); }
  finally { privateKey.fill(0); }
}
const testPrivateKey = Buffer.alloc(32);
testPrivateKey[31] = 2; // Public, insecure scalar!
const originalAddress = addressFromKey(testPrivateKey, true);
const wifPayload = Buffer.concat([testPrivateKey, Buffer.from([1])]);
const testWif = encodeCheck(163, wifPayload);
const restoredAddress = recoverAddressFromWif(testWif);
assert.equal(restoredAddress, originalAddress);
const brokenWif = testWif.slice(0, -1) + (testWif.endsWith('1') ? '2' : '1');
assert.throws(() => recoverAddressFromWif(brokenWif), /Checksum mismatch/);
const wrongNetworkWif = encodeCheck(239, wifPayload);
assert.throws(() => recoverAddressFromWif(wrongNetworkWif), /Wrong FloofyChain mainnet WIF version/);
console.log('PASS: original FloofyChain address generated');
console.log('PASS: test WIF decoded and SAME address recovered offline');
console.log('PASS: corrupted WIF checksum rejected');
console.log('PASS: wrong-network WIF rejected');
console.log('Original address: ', originalAddress);
console.log('Recovered address:', restoredAddress);
console.log('TEST ONLY: deterministic scalar 2; anyone can derive its private key.');
console.log('No Core, no RPC, no real keys, no transactions, no funds moved.');
testPrivateKey.fill(0);
wifPayload.fill(0);
