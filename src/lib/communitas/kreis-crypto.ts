/**
 * Briefkreis server-side crypto helpers — Phase 7 / US5 / T095.
 *
 * Generates the 6-word code and the per-kreis Argon2id salt. The code is
 * NEVER stored on the server; only the salt is persisted. Each member
 * receives the code in their individual introduction mail and types it
 * into the browser, where it is stretched (Argon2id) into the AES-256 key.
 *
 * Threat model: 6 words × 9 bits/word = 54 bits raw entropy. Hardened by
 * Argon2id(64 MiB, 3 iters, 4-way). The server is blind — without the
 * code OR a member's IndexedDB key, ciphertext is opaque.
 */
import { randomBytes } from 'node:crypto';
import { WORDLIST_DE_512 } from './wordlist-de-512';

const SALT_BYTES = 16;
const CODE_WORD_COUNT = 6;
const WORDLIST_BITS = 9; // log2(512)
const WORDLIST_SIZE = 1 << WORDLIST_BITS; // 512

if (WORDLIST_DE_512.length !== WORDLIST_SIZE) {
  // This is a structural invariant. Throwing at module-load fails the build
  // rather than silently degrading entropy.
  throw new Error(
    `wordlist-de-512 must have exactly ${WORDLIST_SIZE} entries (got ${WORDLIST_DE_512.length})`,
  );
}

/**
 * Generate 16 bytes of cryptographically-strong randomness for the
 * per-kreis Argon2id salt. Non-secret; safe to return to any kreis member.
 */
export function generateKreisSalt(): Buffer {
  return randomBytes(SALT_BYTES);
}

/**
 * Generate the 6-word code as an array of words. Joined with single
 * spaces when rendered to the user. Never logged; never persisted.
 *
 * Uses rejection sampling so each index is drawn uniformly from [0, 512).
 */
export function generateKreisCode(): string[] {
  const words: string[] = [];
  // 2 bytes per index → up to 65 536. Modulo 512 (a power of two) is
  // bias-free, but we sample only the low 9 bits to make that obvious.
  const raw = randomBytes(CODE_WORD_COUNT * 2);
  for (let i = 0; i < CODE_WORD_COUNT; i++) {
    const v = raw.readUInt16LE(i * 2) & (WORDLIST_SIZE - 1);
    words.push(WORDLIST_DE_512[v]);
  }
  return words;
}

/**
 * Normalize a user-typed code:
 *   - trim
 *   - collapse all whitespace runs to a single ASCII space
 *   - lowercase
 *
 * Returns the array of words. Does NOT validate that each word is in the
 * wordlist — the UI does that check before submitting to crypto so it can
 * give a precise error message.
 */
export function normalizeKreisCode(input: string): string[] {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export const KREIS_CRYPTO_CONSTANTS = {
  SALT_BYTES,
  CODE_WORD_COUNT,
  WORDLIST_BITS,
  WORDLIST_SIZE,
} as const;
