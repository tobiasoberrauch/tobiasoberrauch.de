/**
 * Phase 7 / US5 — Wordlist invariants.
 *
 * The 6-word kreis code derives its entropy directly from the size and
 * uniqueness of this list. If a future change drops below 512 unique
 * entries — or sneaks in spaces, non-printables, etc. — entropy degrades
 * silently. This test pins the invariants.
 */
import { describe, it, expect } from 'vitest';
import { WORDLIST_DE_512 } from '../../../src/lib/communitas/wordlist-de-512';

describe('WORDLIST_DE_512', () => {
  it('has exactly 512 entries', () => {
    expect(WORDLIST_DE_512.length).toBe(512);
  });

  it('contains only unique entries', () => {
    expect(new Set(WORDLIST_DE_512).size).toBe(WORDLIST_DE_512.length);
  });

  it('all entries are 2–10 characters long', () => {
    for (const w of WORDLIST_DE_512) {
      expect(w.length).toBeGreaterThanOrEqual(2);
      expect(w.length).toBeLessThanOrEqual(10);
    }
  });

  it('all entries are lowercase (German umlauts ä/ö/ü/ß allowed)', () => {
    const allowed = /^[a-zäöüß]+$/;
    for (const w of WORDLIST_DE_512) {
      expect(w).toMatch(allowed);
    }
  });

  it('no entry contains whitespace', () => {
    for (const w of WORDLIST_DE_512) {
      expect(w).not.toMatch(/\s/);
    }
  });
});
