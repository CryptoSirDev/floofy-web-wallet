// Experimental password-protected local vault. NEVER use for real funds.
// Web Crypto AES-GCM; PBKDF2 with a fresh random salt. No network calls.
import { restoreExperimentalAddress } from './experimentalWallet';
const STORAGE_KEY = 'floofy-experimental-vault-v1';
const ROUNDS = 600000;
type RecordV1 = { version: 1; address: string; salt: number[]; iv: number[]; encrypted: number[] };
const bytes = (a: number[]) => new Uint8Array(a);
async function keyFor(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ROUNDS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function read(): RecordV1 | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  const obj: unknown = JSON.parse(stored);
  if (!obj || typeof obj !== 'object') throw Error('Invalid saved vault');
  const v = obj as Record<string, unknown>;
  if (v.version !== 1 || typeof v.address !== 'string') throw Error('Unsupported saved vault');
  for (const [name, length] of [['salt', 16], ['iv', 12]] as const) {
    const a = v[name];
    if (!Array.isArray(a) || a.length !== length || !a.every(x => Number.isInteger(x) && x >= 0 && x <= 255)) throw Error('Damaged saved vault');
  }
  if (!Array.isArray(v.encrypted) || v.encrypted.length < 17 || v.encrypted.length > 256 ||
      !v.encrypted.every(x => Number.isInteger(x) && x >= 0 && x <= 255)) throw Error('Damaged saved vault');
  return v as RecordV1;
}
export function hasTestVault() { return localStorage.getItem(STORAGE_KEY) !== null; }
export function testVaultAddress() { return read()?.address ?? null; }
export async function saveTestVault(wif: string, password: string, replace = false) {
  if (password.length < 12) throw Error('Password must have at least 12 characters');
  if (hasTestVault() && !replace) throw Error('An experimental vault already exists');
  const address = restoreExperimentalAddress(wif);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(password, salt);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(wif)));
  const record: RecordV1 = { version: 1, address, salt: [...salt], iv: [...iv], encrypted: [...encrypted] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return address;
}
export async function unlockTestVault(password: string) {
  const record = read();
  if (!record) throw Error('No saved vault');
  const key = await keyFor(password, bytes(record.salt));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(record.iv) }, key, bytes(record.encrypted));
  const address = restoreExperimentalAddress(new TextDecoder().decode(plain));
  if (address !== record.address) throw Error('Saved address mismatch');
  return address; // Never return the WIF to UI.
}
export function clearTestVault() { localStorage.removeItem(STORAGE_KEY); }
