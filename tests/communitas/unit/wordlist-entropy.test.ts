/**
 * Phase 7 / US5 — Entropy calculation pin.
 *
 * The kreis symkey is derived from a 6-word code over a 512-word list:
 *
 *   raw entropy = 6 × log2(512) = 6 × 9 = 54 bits
 *
 * 54 bits is below the 80-bit threshold one would want for *unauthenticated
 * offline brute-force*. The kreis threat model is different: an attacker
 * cannot mount that attack without first either compromising the server
 * (which is blind to plaintext) OR a member's IndexedDB key. In the
 * compromise-the-server scenario, they additionally have to grind through
 * Argon2id (64 MiB memory, 3 iterations, 4-way parallelism) per candidate.
 *
 * At ~250 ms per Argon2id evaluation on commodity hardware (single core),
 * 2^54 evaluations is on the order of 10^16 seconds — practically infinite.
 *
 * This test pins the calculation so a future commit can't quietly drop the
 * wordlist size below 512 without the entropy budget reasserting.
 */
import { describe, it, expect } from 'vitest';
import { WORDLIST_DE_512 } from '../../../src/lib/communitas/wordlist-de-512';
import { KREIS_CRYPTO_CONSTANTS } from '../../../src/lib/communitas/kreis-crypto';

describe('briefkreis entropy budget', () => {
  it('wordlist size is exactly 2^9 = 512', () => {
    expect(WORDLIST_DE_512.length).toBe(512);
    expect(KREIS_CRYPTO_CONSTANTS.WORDLIST_SIZE).toBe(512);
    expect(KREIS_CRYPTO_CONSTANTS.WORDLIST_BITS).toBe(9);
  });

  it('code length is 6 words → 54 raw bits', () => {
    expect(KREIS_CRYPTO_CONSTANTS.CODE_WORD_COUNT).toBe(6);
    const rawBits =
      KREIS_CRYPTO_CONSTANTS.CODE_WORD_COUNT *
      KREIS_CRYPTO_CONSTANTS.WORDLIST_BITS;
    expect(rawBits).toBe(54);
  });

  it('per-kreis salt is exactly 16 bytes (128 bits) — non-secret but unique', () => {
    expect(KREIS_CRYPTO_CONSTANTS.SALT_BYTES).toBe(16);
  });

  it('combined budget: 54 bits raw + Argon2id stretch (documented)', () => {
    // Pure documentation: 2^54 ≈ 1.8e16. Argon2id (per spec: 64 MiB, t=3,
    // p=4) is the work-factor that makes this infeasible offline. This
    // assertion is a no-op marker so the rationale is searchable in tests.
    const codeSpaceSize = Math.pow(2, 54);
    expect(codeSpaceSize).toBeGreaterThan(1e16);
  });
});
