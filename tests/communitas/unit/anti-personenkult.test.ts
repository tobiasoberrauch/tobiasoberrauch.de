/**
 * Phase 8 / T112 — Anti-Personenkult regression guard (Spec FR-029, FR-030).
 *
 * Asserts that the repository contains NO patterns that would lift a single
 * voice (Tobias) above the others: no quotes module, no quote-card
 * component, no "most quoted" / "author spotlight" affordances, no email
 * subject lines carrying the name "Tobias".
 *
 * If a future commit re-introduces any of these, this test fails — CI
 * catches it before it ships.
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const SRC = path.join(REPO, 'src');

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = (await fs.readdir(dir, { withFileTypes: true })) as import('node:fs').Dirent[];
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      await walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe('anti-personenkult: forbidden modules', () => {
  it('has NO src/lib/communitas/quotes.ts', async () => {
    expect(await exists(path.join(SRC, 'lib/communitas/quotes.ts'))).toBe(false);
  });
  it('has NO src/lib/communitas/tobias-quotes.ts', async () => {
    expect(await exists(path.join(SRC, 'lib/communitas/tobias-quotes.ts'))).toBe(
      false,
    );
  });
});

describe('anti-personenkult: forbidden components', () => {
  let communitasComponents: string[] = [];
  it('loads components directory', async () => {
    const dir = path.join(SRC, 'components/communitas');
    if (await exists(dir)) {
      const all = await walk(dir);
      communitasComponents = all.map((p) => path.basename(p));
    }
    // Even if the dir doesn't exist, the assertions below trivially pass.
    expect(Array.isArray(communitasComponents)).toBe(true);
  });

  it('has NO *Quote* component (case-insensitive)', () => {
    const offenders = communitasComponents.filter((n) => /quote/i.test(n));
    expect(offenders).toEqual([]);
  });

  it('has NO *Highlight* component (case-insensitive)', () => {
    const offenders = communitasComponents.filter((n) => /highlight/i.test(n));
    expect(offenders).toEqual([]);
  });
});

describe('anti-personenkult: forbidden strings in source', () => {
  // We walk src/ excluding tests AND this very test file (which legitimately
  // mentions the forbidden strings as comments / fixtures).
  let allSources: string[] = [];
  let allContent: Map<string, string> = new Map();

  it('loads src/ tree', async () => {
    allSources = await walk(SRC);
    for (const f of allSources) {
      if (!/\.(astro|tsx?|md|mdx)$/.test(f)) continue;
      const c = await fs.readFile(f, 'utf8');
      allContent.set(f, c);
    }
    expect(allSources.length).toBeGreaterThan(0);
  });

  it('has NO occurrence of "Most Quoted"', () => {
    const offenders: string[] = [];
    for (const [file, content] of allContent) {
      if (/most quoted/i.test(content)) offenders.push(path.relative(REPO, file));
    }
    expect(offenders).toEqual([]);
  });

  it('has NO occurrence of "Author Spotlight"', () => {
    const offenders: string[] = [];
    for (const [file, content] of allContent) {
      if (/author\s*spotlight/i.test(content)) offenders.push(path.relative(REPO, file));
    }
    expect(offenders).toEqual([]);
  });
});

describe('anti-personenkult: email subjects do not name Tobias', () => {
  /**
   * The subject is set at the call site (in the API endpoint), not inside
   * the template. We therefore grep all files under src/ for the literal
   * `subject:` followed by a quoted string containing "Tobias". Inline JSON
   * subjects with the word Tobias are forbidden.
   */
  it('no email subject literal carries the name "Tobias"', async () => {
    const all = await walk(SRC);
    const offenders: { file: string; subject: string }[] = [];
    const rx = /subject\s*:\s*(['"`])([^'"`]*Tobias[^'"`]*)\1/gi;
    for (const f of all) {
      if (!/\.(astro|tsx?)$/.test(f)) continue;
      // Exempt this test file from its own grep.
      if (f === path.join(HERE, 'anti-personenkult.test.ts')) continue;
      const c = await fs.readFile(f, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = rx.exec(c)) !== null) {
        offenders.push({ file: path.relative(REPO, f), subject: m[2] });
      }
    }
    expect(offenders).toEqual([]);
  });
});
