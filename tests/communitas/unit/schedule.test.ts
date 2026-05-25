import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  getCommunitasWeekday,
  isMiddayActiveDay,
  pickAnchorForSchaleAndWeekday,
} from '../../../src/lib/communitas/schedule';

// Helper: date at noon UTC for a given ISO date string, to avoid timezone edge
// cases in `getDay()`. We pick local-noon to keep both UTC and CET on the same
// weekday for the assertion.
function local(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

describe('getCommunitasWeekday', () => {
  // Reference week: 2026-05-25 is a Monday.
  it('Monday → spiegel', () => {
    expect(getCommunitasWeekday(local(2026, 5, 25))).toBe('spiegel');
  });
  it('Tuesday → stille', () => {
    expect(getCommunitasWeekday(local(2026, 5, 26))).toBe('stille');
  });
  it('Wednesday → spur', () => {
    expect(getCommunitasWeekday(local(2026, 5, 27))).toBe('spur');
  });
  it('Thursday → begegnung', () => {
    expect(getCommunitasWeekday(local(2026, 5, 28))).toBe('begegnung');
  });
  it('Friday → versöhnung', () => {
    expect(getCommunitasWeekday(local(2026, 5, 29))).toBe('versöhnung');
  });
  it('Saturday → werk', () => {
    expect(getCommunitasWeekday(local(2026, 5, 30))).toBe('werk');
  });
  it('Sunday → sammlung', () => {
    expect(getCommunitasWeekday(local(2026, 5, 31))).toBe('sammlung');
  });
});

describe('isMiddayActiveDay', () => {
  it('is true on Mon/Wed/Fri only', () => {
    expect(isMiddayActiveDay(local(2026, 5, 25))).toBe(true);  // Mon
    expect(isMiddayActiveDay(local(2026, 5, 26))).toBe(false); // Tue
    expect(isMiddayActiveDay(local(2026, 5, 27))).toBe(true);  // Wed
    expect(isMiddayActiveDay(local(2026, 5, 28))).toBe(false); // Thu
    expect(isMiddayActiveDay(local(2026, 5, 29))).toBe(true);  // Fri
    expect(isMiddayActiveDay(local(2026, 5, 30))).toBe(false); // Sat
    expect(isMiddayActiveDay(local(2026, 5, 31))).toBe(false); // Sun
  });
});

describe('pickAnchorForSchaleAndWeekday', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'communitas-anchor-'));
    // Only seed the speculum/morning pool — silentium is empty, to exercise
    // the fallback path.
    const specDir = path.join(root, 'anchors', 'morning', 'speculum');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(path.join(specDir, 'spiegel-01.md'), '# Spiegel 1\n');
    writeFileSync(path.join(specDir, 'spiegel-02.md'), '# Spiegel 2\n');
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds an entry in the target pool', () => {
    const p = pickAnchorForSchaleAndWeekday('speculum', 'spiegel', 'morning', root, local(2026, 5, 25));
    expect(p).not.toBeNull();
    expect(p).toMatch(/speculum\/spiegel-0[12]\.md$/);
  });

  it('falls back to speculum when the target pool is empty', () => {
    const p = pickAnchorForSchaleAndWeekday('silentium', 'spiegel', 'morning', root, local(2026, 5, 25));
    expect(p).not.toBeNull();
    expect(p).toMatch(/speculum\/spiegel-0[12]\.md$/);
  });

  it('returns null when both target and fallback pools are empty', () => {
    const p = pickAnchorForSchaleAndWeekday('silentium', 'sammlung', 'evening', root, local(2026, 5, 25));
    expect(p).toBeNull();
  });

  it('is deterministic across runs for the same date', () => {
    const d = local(2026, 5, 25);
    const a = pickAnchorForSchaleAndWeekday('speculum', 'spiegel', 'morning', root, d);
    const b = pickAnchorForSchaleAndWeekday('speculum', 'spiegel', 'morning', root, d);
    expect(a).toBe(b);
  });
});
