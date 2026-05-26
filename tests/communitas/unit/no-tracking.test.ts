/**
 * Phase 8 / T113 — No-tracking guard for Communitas surfaces (Spec SC-008).
 *
 * Source-file regression check (complements email-no-tracking.test.ts, which
 * looks at rendered HTML). Walks the source tree under:
 *   src/pages/communitas/
 *   src/pages/communitas-mitglied/
 *   src/lib/communitas/email-templates/
 *
 * Asserts that NO file contains:
 *   - fbq(           (Meta-Pixel)
 *   - gtag(          (Google Analytics / Ads)
 *   - googletagmanager.com
 *   - linkedin.com/insight
 *   - mixpanel
 *   - hotjar
 *   - connect.facebook.net
 *
 * Additionally: every email-template source contains ZERO `<img\s+src` —
 * we never embed images (avoids tracking pixels and saves bandwidth on
 * plain-text mail clients).
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');

const SURFACES = [
  path.join(REPO, 'src/pages/communitas'),
  path.join(REPO, 'src/pages/communitas-mitglied'),
];

const EMAIL_TEMPLATES = path.join(REPO, 'src/lib/communitas/email-templates');

const FORBIDDEN_TRACKERS: Array<{ name: string; re: RegExp }> = [
  { name: 'fbq(', re: /\bfbq\s*\(/i },
  { name: 'gtag(', re: /\bgtag\s*\(/i },
  { name: 'googletagmanager.com', re: /googletagmanager\.com/i },
  { name: 'linkedin.com/insight', re: /linkedin\.com\/insight/i },
  { name: 'mixpanel', re: /\bmixpanel\b/i },
  { name: 'hotjar', re: /\bhotjar\b/i },
  { name: 'connect.facebook.net', re: /connect\.facebook\.net/i },
];

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

describe('no-tracking: communitas pages contain no trackers', () => {
  for (const tracker of FORBIDDEN_TRACKERS) {
    it(`no file under communitas/ or communitas-mitglied/ contains ${tracker.name}`, async () => {
      const offenders: string[] = [];
      for (const dir of SURFACES) {
        const files = await walk(dir);
        for (const f of files) {
          if (!/\.(astro|tsx?|md|mdx|html|css)$/.test(f)) continue;
          const content = await fs.readFile(f, 'utf8');
          if (tracker.re.test(content)) {
            offenders.push(path.relative(REPO, f));
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});

describe('no-tracking: email templates contain no <img> tags', () => {
  it('zero <img src= matches across all template source files', async () => {
    const files = await walk(EMAIL_TEMPLATES);
    const offenders: { file: string; match: string }[] = [];
    const rx = /<img\s+src/i;
    for (const f of files) {
      if (!/\.(astro|tsx?)$/.test(f)) continue;
      const content = await fs.readFile(f, 'utf8');
      const m = rx.exec(content);
      if (m) offenders.push({ file: path.relative(REPO, f), match: m[0] });
    }
    expect(offenders).toEqual([]);
  });
});
