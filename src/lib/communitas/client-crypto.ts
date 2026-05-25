// @ts-check
/**
 * Browser-only AES-GCM + Argon2id helpers for the Zelle and Briefkreis.
 *
 * This module must NEVER be imported on the server. It throws on import if
 * `window` is not defined to make accidental SSR imports loud.
 *
 * Storage model:
 *   - The passphrase is never persisted. The user types it once to derive an
 *     AES-GCM CryptoKey via Argon2id (mem=64 MiB, iter=3, parallelism=4).
 *   - The derived key is stored as a non-extractable CryptoKey in IndexedDB
 *     under a slot name (e.g. "cell" or "kreis-42"), origin-bound.
 *   - On "Passphrase vergessen": wipeKeys() drops the IndexedDB entry. The
 *     ciphertext on the server becomes unreadable — by design.
 */

import { argon2id } from '@noble/hashes/argon2';

function assertBrowser(): void {
  if (typeof window === 'undefined' || typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('client-crypto.ts must only be used in a browser context.');
  }
}

// Argon2id parameters chosen per spec (T017, T085). 64 MiB / 3 iters / 4-way.
// Returns 32 bytes suitable for AES-256.
const ARGON_MEM_KiB = 64 * 1024; // 64 MiB
const ARGON_ITERS = 3;
const ARGON_PARALLEL = 4;
const ARGON_OUT_LEN = 32;

// Fixed application-level salt prefix combined with a slot string so two slots
// derived from the same passphrase produce different keys. The slot must be
// stable across sessions (e.g. "cell", "kreis-42").
const SALT_PREFIX = 'communitas:v1:';

/**
 * Derive a non-extractable AES-GCM 256 CryptoKey from a passphrase.
 *
 * We use Argon2id for the password stretch (defends against weak passphrases),
 * then import the raw 32 bytes into Web Crypto.
 */
export async function deriveKey(
  passphrase: string,
  slot: string
): Promise<CryptoKey> {
  assertBrowser();
  const enc = new TextEncoder();
  const salt = enc.encode(SALT_PREFIX + slot);
  const raw = argon2id(enc.encode(passphrase), salt, {
    t: ARGON_ITERS,
    m: ARGON_MEM_KiB,
    p: ARGON_PARALLEL,
    dkLen: ARGON_OUT_LEN,
  });
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface CipherBlob {
  ciphertext: Uint8Array; // includes the 16-byte GCM tag (Web Crypto appends it)
  iv: Uint8Array;        // 12 bytes
}

export async function encryptText(
  plaintext: string,
  key: CryptoKey
): Promise<CipherBlob> {
  assertBrowser();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return { ciphertext: new Uint8Array(ct), iv };
}

export async function decryptText(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey
): Promise<string> {
  assertBrowser();
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(dec);
}

// ---------------------------------------------------------------------------
// IndexedDB wrapper — minimal, no dependencies.
// ---------------------------------------------------------------------------

const DB_NAME = 'communitas';
const STORE_NAME = 'keys';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  assertBrowser();
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeKeyInIndexedDB(
  key: CryptoKey,
  slot: string
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(key, slot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadKeyFromIndexedDB(
  slot: string
): Promise<CryptoKey | null> {
  const db = await openDb();
  const result = await new Promise<CryptoKey | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(slot);
    req.onsuccess = () => resolve((req.result as CryptoKey | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

/**
 * Wipe every stored key from IndexedDB. Used for the passphrase-reset flow:
 * the user accepts that ciphertext on the server will become unreadable.
 */
export async function wipeKeys(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
