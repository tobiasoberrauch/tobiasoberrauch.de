import { describe, it, expect } from 'vitest';
import {
  shouldSendAnker,
  truncateSubject,
  localHourInZone,
  localDateInZone,
  isPhaseOneZone,
} from '../../../src/lib/communitas/cron-helpers';

/**
 * Unit-tests for the pure helpers behind the cron handlers. The real
 * idempotency guarantee comes from the `ON CONFLICT … DO NOTHING RETURNING`
 * pattern, but the in-memory pre-filter must also be correct so the cron
 * doesn't render content for already-served members.
 */
describe('shouldSendAnker', () => {
  it('returns true when the date is not in the already-logged set', () => {
    expect(shouldSendAnker(1, 'morning', '2026-05-25', [])).toBe(true);
    expect(shouldSendAnker(1, 'morning', '2026-05-25', ['2026-05-24'])).toBe(true);
  });

  it('returns false when the date is already logged', () => {
    expect(shouldSendAnker(1, 'morning', '2026-05-25', ['2026-05-25'])).toBe(false);
  });

  it('accepts a Set as the already-logged collection', () => {
    const set = new Set(['2026-05-25']);
    expect(shouldSendAnker(1, 'morning', '2026-05-25', set)).toBe(false);
    expect(shouldSendAnker(1, 'morning', '2026-05-26', set)).toBe(true);
  });

  it('called twice for the same day yields only one positive — simulated', () => {
    // Mimics the cron loop: track what we've claimed so far in this run.
    const claimed = new Set<string>();
    const today = '2026-05-25';

    // First call: should send
    const first = shouldSendAnker(42, 'morning', today, claimed);
    expect(first).toBe(true);
    if (first) claimed.add(today);

    // Second call (same cron pass replayed, or two cron entries on the
    // same minute) — must not send again.
    const second = shouldSendAnker(42, 'morning', today, claimed);
    expect(second).toBe(false);
  });
});

describe('truncateSubject', () => {
  it('passes short strings through', () => {
    expect(truncateSubject('Wo bist du?')).toBe('Wo bist du?');
  });

  it('truncates at the last whole word under the limit', () => {
    const long = 'Wo bist du heute nicht du selbst gewesen und morgen anders?';
    const out = truncateSubject(long, 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith('…')).toBe(false);
    // The output must be a prefix of the (whitespace-collapsed) original,
    // ending exactly on a word boundary (no mid-word cut).
    const collapsed = long.replace(/\s+/g, ' ').trim();
    expect(collapsed.startsWith(out)).toBe(true);
    // The character right after the cut (if any) is a space — proving we
    // cut on a word boundary, not in the middle of a word.
    if (out.length < collapsed.length) {
      expect(collapsed[out.length]).toBe(' ');
    }
  });

  it('collapses repeated whitespace', () => {
    expect(truncateSubject('Wo   bist   du?')).toBe('Wo bist du?');
  });
});

describe('localHourInZone', () => {
  it('returns a number in [0, 23]', () => {
    const h = localHourInZone(new Date('2026-05-25T10:00:00Z'), 'Europe/Berlin');
    expect(typeof h).toBe('number');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
  });

  it('produces a 2-hour offset for Berlin in summer', () => {
    // 2026-05-25 10:00 UTC = 12:00 Berlin (CEST, UTC+2)
    expect(localHourInZone(new Date('2026-05-25T10:00:00Z'), 'Europe/Berlin')).toBe(12);
  });
});

describe('localDateInZone', () => {
  it('returns YYYY-MM-DD', () => {
    const d = localDateInZone(new Date('2026-05-25T10:00:00Z'), 'Europe/Berlin');
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d).toBe('2026-05-25');
  });

  it('rolls over to the next date past midnight in the local zone', () => {
    // 2026-05-25 23:30 UTC = 01:30 Berlin next day
    const d = localDateInZone(new Date('2026-05-25T23:30:00Z'), 'Europe/Berlin');
    expect(d).toBe('2026-05-26');
  });
});

describe('isPhaseOneZone', () => {
  it('accepts European zones', () => {
    expect(isPhaseOneZone('Europe/Berlin')).toBe(true);
    expect(isPhaseOneZone('Europe/Vienna')).toBe(true);
  });

  it('rejects non-European zones', () => {
    expect(isPhaseOneZone('America/New_York')).toBe(false);
    expect(isPhaseOneZone('Asia/Tokyo')).toBe(false);
    expect(isPhaseOneZone('UTC')).toBe(false);
  });
});
