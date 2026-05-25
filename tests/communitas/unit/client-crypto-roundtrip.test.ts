/**
 * Phase 6 / US4 / T093 — Argon2id + AES-GCM round-trip invariants.
 *
 * We import the *Core variants from client-crypto.ts, which skip the
 * browser-only guard (Node 22 has crypto.subtle globally). The Argon2id
 * parameters are non-negotiable per spec — these tests fix them.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveKeyCore,
  encryptTextCore,
  decryptTextCore,
} from '../../../src/lib/communitas/client-crypto';

const PASS_GOOD = 'test passphrase 1234567890';
const PASS_BAD = 'ganz andere passphrase 0987';

function freshSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

describe('client-crypto round-trip', () => {
  it('encrypt then decrypt with same key + salt recovers plaintext', async () => {
    const salt = freshSalt();
    const key = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const plain = 'Heute war schwer, aber nötig.';
    const blob = await encryptTextCore(plain, key);
    const back = await decryptTextCore(blob.ciphertext, blob.iv, key);
    expect(back).toBe(plain);
  });

  it('same passphrase + same salt produces different ciphertexts (random IV) but same plaintext on decrypt', async () => {
    const salt = freshSalt();
    const key = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const plain = 'Wiederholung ist nicht Stillstand.';
    const a = await encryptTextCore(plain, key);
    const b = await encryptTextCore(plain, key);

    expect(Buffer.from(a.ciphertext).equals(Buffer.from(b.ciphertext))).toBe(
      false,
    );
    expect(Buffer.from(a.iv).equals(Buffer.from(b.iv))).toBe(false);

    expect(await decryptTextCore(a.ciphertext, a.iv, key)).toBe(plain);
    expect(await decryptTextCore(b.ciphertext, b.iv, key)).toBe(plain);
  });

  it('decrypting with the WRONG passphrase throws (AES-GCM auth-tag mismatch)', async () => {
    const salt = freshSalt();
    const keyGood = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const keyBad = await deriveKeyCore(PASS_BAD, 'cell', salt);

    const blob = await encryptTextCore('streng vertraulich', keyGood);
    await expect(
      decryptTextCore(blob.ciphertext, blob.iv, keyBad),
    ).rejects.toThrow();
  });

  it('decrypting with the WRONG salt throws', async () => {
    const saltA = freshSalt();
    const saltB = freshSalt();
    const keyA = await deriveKeyCore(PASS_GOOD, 'cell', saltA);
    const keyB = await deriveKeyCore(PASS_GOOD, 'cell', saltB);
    const blob = await encryptTextCore('Eintrag', keyA);
    await expect(
      decryptTextCore(blob.ciphertext, blob.iv, keyB),
    ).rejects.toThrow();
  });

  it('same passphrase + same salt on a fresh derivation produces an equivalent key (cross-device invariant)', async () => {
    const salt = freshSalt();
    const k1 = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const k2 = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const blob = await encryptTextCore('mehrere Geräte', k1);
    expect(await decryptTextCore(blob.ciphertext, blob.iv, k2)).toBe(
      'mehrere Geräte',
    );
  });

  it('server-blind invariant: ciphertext bytes do NOT contain the plaintext as a substring', async () => {
    const salt = freshSalt();
    const key = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const plain =
      'xyz_unique_marker_2026 — diese Zeichenkette muss verschwinden im Chiffrat.';
    const blob = await encryptTextCore(plain, key);
    const ctBytes = Buffer.from(blob.ciphertext);
    const plainBytes = Buffer.from(plain, 'utf8');

    // The marker substring must not survive encryption.
    expect(ctBytes.includes(plainBytes)).toBe(false);

    // Also check a smaller distinctive sub-sequence.
    const marker = Buffer.from('xyz_unique_marker_2026', 'utf8');
    expect(ctBytes.includes(marker)).toBe(false);
  });

  it('IV is exactly 12 bytes (AES-GCM spec)', async () => {
    const salt = freshSalt();
    const key = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const blob = await encryptTextCore('x', key);
    expect(blob.iv.length).toBe(12);
  });

  it('ciphertext for empty plaintext is still produced and the GCM tag is appended (>= 16 bytes)', async () => {
    const salt = freshSalt();
    const key = await deriveKeyCore(PASS_GOOD, 'cell', salt);
    const blob = await encryptTextCore('', key);
    // 16-byte auth tag is appended even for empty plaintext.
    expect(blob.ciphertext.length).toBeGreaterThanOrEqual(16);
    expect(await decryptTextCore(blob.ciphertext, blob.iv, key)).toBe('');
  });
}, /* timeout */ 30_000);
