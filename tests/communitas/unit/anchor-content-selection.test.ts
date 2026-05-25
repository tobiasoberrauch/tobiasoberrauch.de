import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pickAnchorForSchaleAndWeekday } from '../../../src/lib/communitas/schedule';
import { parseAnchorMarkdown } from '../../../src/lib/communitas/cron-helpers';

/**
 * These tests verify that the cron's content-selection layer:
 *   - finds an existing anchor for (schale, weekday, kind)
 *   - falls back to `speculum` when the target schale's pool is empty
 *   - returns the same pick on repeated calls with the same date
 *
 * They use an isolated tmpdir so the live content under
 * `src/lib/communitas/content/anchors/` is irrelevant to the assertions.
 */
describe('pickAnchorForSchaleAndWeekday — Phase 4', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'communitas-anchor-p4-'));
    // Seed only speculum/morning so silentium falls back.
    const dir = path.join(root, 'anchors', 'morning', 'speculum');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'spiegel.md'), '*Vers.*\n\nFrage?\n');
    writeFileSync(path.join(dir, 'versoehnung.md'), '*Versöhnungs-Vers.*\n\nVersöhnungs-Frage?\n');
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds the existing file for speculum/spiegel', () => {
    const p = pickAnchorForSchaleAndWeekday('speculum', 'spiegel', 'morning', root, new Date(2026, 4, 25));
    expect(p).not.toBeNull();
    expect(p).toMatch(/speculum\/spiegel\.md$/);
  });

  it('falls back to speculum when logos pool is empty', () => {
    const p = pickAnchorForSchaleAndWeekday('logos', 'spiegel', 'morning', root, new Date(2026, 4, 25));
    expect(p).not.toBeNull();
    expect(p).toMatch(/speculum\/spiegel\.md$/);
  });

  it('is deterministic for repeated calls with the same date', () => {
    const d = new Date(2026, 4, 25);
    const a = pickAnchorForSchaleAndWeekday('speculum', 'spiegel', 'morning', root, d);
    const b = pickAnchorForSchaleAndWeekday('speculum', 'spiegel', 'morning', root, d);
    expect(a).toBe(b);
  });

  it('matches versöhnung (umlaut) against versoehnung.md (ASCII fold)', () => {
    const d = new Date(2026, 4, 29); // Friday
    const p = pickAnchorForSchaleAndWeekday('speculum', 'versöhnung', 'morning', root, d);
    expect(p).not.toBeNull();
    expect(p).toMatch(/speculum\/versoehnung\.md$/);
  });
});

describe('parseAnchorMarkdown', () => {
  it('separates verse from question', () => {
    const md = `*Du musst dein Leben ändern.*
— Rilke

Wo bist du heute nicht du selbst gewesen?
`;
    const r = parseAnchorMarkdown(md);
    expect(r.isPlaceholder).toBe(false);
    expect(r.verse).toContain('Rilke');
    expect(r.question).toContain('Wo bist du');
  });

  it('detects TODO placeholders', () => {
    const md = '# TODO: Anker für vox am stille-Tag noch nicht kuratiert.\n';
    const r = parseAnchorMarkdown(md);
    expect(r.isPlaceholder).toBe(true);
  });

  it('handles question-only files (no verse)', () => {
    const md = 'Heute ohne Mittagsspur. Bewusst.\n\nWas hörst du, wenn du nicht antwortest?\n';
    const r = parseAnchorMarkdown(md);
    expect(r.isPlaceholder).toBe(false);
    expect(r.question).toContain('Was hörst du');
  });
});
