import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { validateApplicationBody } from '../../../src/lib/communitas/validation';
import { encryptLetter, decryptLetter } from '../../../src/lib/communitas/crypto';

describe('validateApplicationBody', () => {
  function ok(extra: Record<string, unknown> = {}) {
    return {
      name: 'Erika Musterfrau',
      email: 'erika@example.de',
      question: 'Was suche ich hier?',
      consent: true,
      ...extra,
    };
  }

  it('accepts a minimal valid body', () => {
    const r = validateApplicationBody(ok());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe('erika@example.de');
      expect(r.value.desired_tier).toBe('basis');
    }
  });

  it('rejects an invalid email', () => {
    const r = validateApplicationBody(ok({ email: 'not-an-email' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('email');
  });

  it('rejects missing consent', () => {
    const r = validateApplicationBody(ok({ consent: false }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('consent');
  });

  it('accepts consent in form-encoded shape ("on")', () => {
    const r = validateApplicationBody(ok({ consent: 'on' }));
    expect(r.ok).toBe(true);
  });

  it('rejects a question over 2000 chars', () => {
    const r = validateApplicationBody(ok({ question: 'x'.repeat(2001) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('question');
  });

  it('rejects an empty question', () => {
    const r = validateApplicationBody(ok({ question: '   ' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('question');
  });

  it('rejects a letter_to_self over 10000 chars', () => {
    const r = validateApplicationBody(ok({ letter_to_self: 'a'.repeat(10001) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('letter_to_self');
  });

  it('accepts a letter_to_self exactly at 10000 chars', () => {
    const r = validateApplicationBody(ok({ letter_to_self: 'a'.repeat(10000) }));
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown desired_tier', () => {
    const r = validateApplicationBody(ok({ desired_tier: 'platinum' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('desired_tier');
  });

  it('rejects a name that is too long', () => {
    const r = validateApplicationBody(ok({ name: 'x'.repeat(121) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe('name');
  });

  it('rejects null input', () => {
    const r = validateApplicationBody(null);
    expect(r.ok).toBe(false);
  });
});

describe('encryptLetter / decryptLetter round-trip', () => {
  const previousKey = process.env.LETTER_ENCRYPTION_KEY;

  beforeAll(() => {
    // 32 random bytes, base64-encoded.
    process.env.LETTER_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  });

  afterAll(() => {
    if (previousKey === undefined) {
      delete process.env.LETTER_ENCRYPTION_KEY;
    } else {
      process.env.LETTER_ENCRYPTION_KEY = previousKey;
    }
  });

  it('recovers the original plaintext', () => {
    const plaintext = 'Liebe zukünftige Erika, hier ist mein Brief — mit Umlauten ÄÖÜß.';
    const { ciphertext, iv } = encryptLetter(plaintext);
    const decoded = decryptLetter(ciphertext, iv);
    expect(decoded).toBe(plaintext);
  });

  it('ciphertext does not contain plaintext as substring', () => {
    const plaintext = 'Geheimnis: schwarzer Hund.';
    const { ciphertext } = encryptLetter(plaintext);
    const asUtf8 = Buffer.from(ciphertext).toString('utf8');
    expect(asUtf8.includes(plaintext)).toBe(false);
    expect(asUtf8.includes('schwarzer Hund')).toBe(false);
  });

  it('decryption throws on tampered ciphertext', () => {
    const { ciphertext, iv } = encryptLetter('hallo');
    const tampered = Buffer.from(ciphertext);
    tampered[0] ^= 0xff;
    expect(() => decryptLetter(tampered, iv)).toThrow();
  });
});
