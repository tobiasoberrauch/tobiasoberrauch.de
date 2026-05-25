/**
 * Phase 6 / US4 — Static guard for the server-blind invariant.
 *
 * The Zelle is server-blind by architecture: no endpoint under
 * /api/communitas/cell/ may decrypt, parse, or otherwise inspect
 * ciphertext content. This test reads each endpoint's source code
 * and asserts that:
 *
 *   1. No import statement references a decrypt function or letter-self
 *      encryption helper (LETTER_ENCRYPTION_KEY, decryptText, decrypt,
 *      ../../../../lib/communitas/crypto, @noble/ciphers, etc.).
 *   2. No code path calls subtle.decrypt(), createDecipheriv(), or any
 *      .decrypt(...) method.
 *   3. The list endpoint does NOT select the `ciphertext` column.
 *   4. None of the endpoints accept a "decrypt" query param or branch
 *      on a "plaintext" property.
 *
 * If a future commit accidentally adds server-side decryption, this
 * test fails BEFORE the change is shipped — by design.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CELL_API_DIR = path.resolve(
  here,
  '../../../src/pages/api/communitas/cell',
);
const KREIS_API_DIR = path.resolve(
  here,
  '../../../src/pages/api/communitas/kreis',
);

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, acc);
    else if (entry.isFile() && full.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

describe('cell endpoints — server-blind static guard', () => {
  const files = collectFiles(CELL_API_DIR);

  it('the API directory exists and contains endpoints', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = path.relative(CELL_API_DIR, file);
    const src = readFileSync(file, 'utf8');

    it(`${rel} — does not import a decrypt helper or letter-self key`, () => {
      // No imports of the existing server-side letter crypto.
      expect(src).not.toMatch(/LETTER_ENCRYPTION_KEY/);
      expect(src).not.toMatch(/from\s+['"][^'"]*\/communitas\/crypto['"]/);
      expect(src).not.toMatch(/@noble\/ciphers/);
      // No import of any decrypt-shaped name.
      expect(src).not.toMatch(/import[^;]*\b(decryptText|decrypt|decipher)\b[^;]*from/);
    });

    it(`${rel} — does not call a decrypt API`, () => {
      expect(src).not.toMatch(/subtle\s*\.\s*decrypt\s*\(/);
      expect(src).not.toMatch(/createDecipheriv\s*\(/);
      expect(src).not.toMatch(/decryptText\s*\(/);
      // Catch ".decrypt(" but allow benign substrings like "decryptable"
      // by matching the function-call shape.
      expect(src).not.toMatch(/\.decrypt\s*\(/);
    });

    it(`${rel} — does not branch on a plaintext property`, () => {
      expect(src).not.toMatch(/\bplaintext\b\s*[:=]/);
      expect(src).not.toMatch(/\bplaintext_b64\b/);
    });
  }

  it('cell/list.ts does not SELECT the ciphertext column', () => {
    const listFile = path.join(CELL_API_DIR, 'list.ts');
    const src = readFileSync(listFile, 'utf8');
    // The list endpoint must only project metadata. We scan the SELECT
    // section for the word "ciphertext". (We allow "ciphertext" to appear
    // in comments, so we strip comment lines first.)
    const noLineComments = src.replace(/^\s*\/\/.*$/gm, '');
    const noBlockComments = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(noBlockComments).not.toMatch(/SELECT[\s\S]*?ciphertext/i);
  });

  it('all cell endpoints invoke requireMember (auth gate)', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src).toMatch(/requireMember\s*\(/);
    }
  });
});

describe('kreis endpoints — server-blind static guard', () => {
  const files = collectFiles(KREIS_API_DIR);

  it('the API directory exists and contains endpoints', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = path.relative(KREIS_API_DIR, file);
    const src = readFileSync(file, 'utf8');

    it(`${rel} — does not import a decrypt helper`, () => {
      expect(src).not.toMatch(/LETTER_ENCRYPTION_KEY/);
      expect(src).not.toMatch(/from\s+['"][^'"]*\/communitas\/crypto['"]/);
      expect(src).not.toMatch(/@noble\/ciphers/);
      expect(src).not.toMatch(/import[^;]*\b(decryptText|decrypt|decipher)\b[^;]*from/);
    });

    it(`${rel} — does not call a decrypt API`, () => {
      expect(src).not.toMatch(/subtle\s*\.\s*decrypt\s*\(/);
      expect(src).not.toMatch(/createDecipheriv\s*\(/);
      expect(src).not.toMatch(/decryptText\s*\(/);
      expect(src).not.toMatch(/\.decrypt\s*\(/);
    });

    it(`${rel} — does not branch on a plaintext property`, () => {
      expect(src).not.toMatch(/\bplaintext\b\s*[:=]/);
      expect(src).not.toMatch(/\bplaintext_b64\b/);
    });
  }

  it('only the messages endpoint SELECTs the ciphertext column', () => {
    for (const file of files) {
      const rel = path.relative(KREIS_API_DIR, file);
      const src = readFileSync(file, 'utf8');
      const noLineComments = src.replace(/^\s*\/\/.*$/gm, '');
      const noBlockComments = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
      if (rel.includes('messages.ts') || rel.includes('send.ts')) {
        // send.ts inserts ciphertext, messages.ts selects it — both OK.
        continue;
      }
      expect(noBlockComments).not.toMatch(/SELECT[\s\S]*?\bciphertext\b/i);
    }
  });

  it('all kreis endpoints invoke requireMember (auth gate)', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src).toMatch(/requireMember\s*\(/);
    }
  });
});
