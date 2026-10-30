// Separate experimental BIP39 vault. Not compatible with the legacy WIF vault.
// Browser-only AES-256-GCM encryption with PBKDF2-SHA256. TEST WALLETS ONLY.
import { deriveTestBip39Addresses, isValidTestMnemonic, normalizeTestMnemonic } from './experimentalBip39';
const STORAGE_KEY = 'floofy-experimental-bip39-v1';
const ROUNDS = 600000;
type VaultRecord = { version: 1; address: string; salt: number[]; iv: number[]; encrypted: number[] };
function validBytes(value: unknown, min: number, max: number): value is number[] {
  return Array.isArray(value) && value.length >= min && value.length <= max &&
    value.every(x => Number.isInteger(x) && x >= 0 && x <= 255);
}
function read(): VaultRecord | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw Error('Invalid test vault');
  const r = value as Record<string, unknown>;
  if (r.version !== 1 || typeof r.address !== 'string' ||
      !validBytes(r.salt, 16, 16) || !validBytes(r.iv, 12, 12) ||
      !validBytes(r.encrypted, 17, 4096)) throw Error('Invalid test vault');
  return r as VaultRecord;
}
async function encryptionKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ROUNDS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export function hasBip39TestVault() { return localStorage.getItem(STORAGE_KEY) !== null; }
export function bip39TestVaultAddress() { return read()?.address ?? null; }
export async function saveBip39TestVault(phrase: string, password: string) {
  if (hasBip39TestVault()) throw Error('A BIP39 test vault already exists');
  if (password.length < 12) throw Error('Password must contain at least 12 characters');
  const normalized = normalizeTestMnemonic(phrase);
  if (!isValidTestMnemonic(normalized)) throw Error('Invalid test phrase');
  const address = deriveTestBip39Addresses(normalized, '', 1)[0].address;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(password, salt);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(normalized)));
  const record: VaultRecord = { version: 1, address, salt: [...salt], iv: [...iv], encrypted: [...encrypted] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return address;
}
export async function unlockBip39TestVault(password: string) {
  const record = read();
  if (!record) throw Error('No BIP39 test vault');
  const key = await encryptionKey(password, new Uint8Array(record.salt));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, key, new Uint8Array(record.encrypted));
  const decoded = new TextDecoder().decode(plain);
  const derived = deriveTestBip39Addresses(decoded, '', 1)[0].address;
  if (derived !== record.address) throw Error('Test vault address mismatch');
  return derived; // Do not expose mnemonic to the UI.
}

// Recover an EXISTING local test vault only if the phrase derives its saved address.
// Do not replace the old ciphertext until encryption succeeds.
export async function recoverBip39TestVault(phrase: string, newPassword: string) {
  const existing = read();
  if (!existing) throw Error('No existing BIP39 test vault');
  if (newPassword.length < 12) throw Error('New password must contain at least 12 characters');
  const normalized = normalizeTestMnemonic(phrase);
  if (!isValidTestMnemonic(normalized)) throw Error('Invalid 24-word test phrase');
  const address = deriveTestBip39Addresses(normalized, '', 1)[0].address;
  if (address !== existing.address) throw Error('Recovery phrase does not match this saved test wallet');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(newPassword, salt);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(normalized)));
  const record: VaultRecord = { version: 1, address, salt: [...salt], iv: [...iv], encrypted: [...encrypted] };
  // Re-check that the original has not been replaced during asynchronous encryption.
  const current = read();
  if (!current || current.address !== existing.address ||
      current.iv.some((v, i) => v !== existing.iv[i]) ||
      current.salt.some((v, i) => v !== existing.salt[i])) throw Error('Saved vault changed during recovery');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return address;
}
export function clearBip39TestVault() { localStorage.removeItem(STORAGE_KEY); }
