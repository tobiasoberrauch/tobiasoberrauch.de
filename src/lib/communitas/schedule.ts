/**
 * Pure scheduling helpers for the Cotidianum.
 *
 * No DB access, no async — these are deterministic functions used both at
 * cron-time and in unit tests.
 */

import { readdirSync } from 'node:fs';
import path from 'node:path';

export type CommunitasWeekday =
  | 'spiegel'
  | 'stille'
  | 'spur'
  | 'begegnung'
  | 'versöhnung'
  | 'werk'
  | 'sammlung';

/**
 * Map a Date to the symbolic weekday name used by the Cotidianum.
 *
 *   Mon → spiegel
 *   Tue → stille
 *   Wed → spur
 *   Thu → begegnung
 *   Fri → versöhnung
 *   Sat → werk
 *   Sun → sammlung
 *
 * The mapping is fixed and intentionally locale-agnostic; we use the JS
 * day-of-week index (0 = Sunday).
 */
export function getCommunitasWeekday(d: Date): CommunitasWeekday {
  const dow = d.getDay();
  switch (dow) {
    case 1: return 'spiegel';
    case 2: return 'stille';
    case 3: return 'spur';
    case 4: return 'begegnung';
    case 5: return 'versöhnung';
    case 6: return 'werk';
    case 0: return 'sammlung';
    default: throw new Error(`Unexpected day-of-week: ${dow}`);
  }
}

/**
 * Return true only on Mon/Wed/Fri — the days the midday anchor is sent.
 * Tue/Thu/Sat/Sun: silence by architecture (Spec FR-011).
 */
export function isMiddayActiveDay(d: Date): boolean {
  const dow = d.getDay();
  return dow === 1 || dow === 3 || dow === 5;
}

export type AnchorKind = 'morning' | 'noon' | 'evening';

/**
 * Day-of-year (1–366) helper for deterministic-but-varying selection.
 * UTC-based to avoid DST drift.
 */
function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const here = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((here - start) / (24 * 60 * 60 * 1000));
}

/**
 * Pick a Markdown file for the given (schale, weekday, anchor-kind) tuple.
 *
 * Layout:
 *   ${contentRoot}/anchors/${kind}/${schaleKey}/${weekday}*.md
 *
 * Selection: list matching files, sort alphabetically, then index by
 * (day-of-year mod list-length) — deterministic and varied across the year.
 *
 * Fallback: if no files exist for the target schale, repeat the search with
 * the `speculum` pool. If that pool is also empty, return null.
 *
 * Returns the absolute file path (so the caller can read+render it) or null.
 *
 * IMPORTANT: `today` is passed in by the caller (the cron handler computes
 * the member's local date) — we do not call `new Date()` here.
 */
export function pickAnchorForSchaleAndWeekday(
  schaleKey: string,
  weekday: CommunitasWeekday,
  kind: AnchorKind,
  contentRoot: string,
  today: Date = new Date()
): string | null {
  const candidate = tryPool(contentRoot, kind, schaleKey, weekday, today);
  if (candidate) return candidate;
  if (schaleKey !== 'speculum') {
    const fallback = tryPool(contentRoot, kind, 'speculum', weekday, today);
    if (fallback) return fallback;
  }
  return null;
}

/**
 * ASCII-fold a weekday for filename matching. Filenames live in plain ASCII so
 * they remain portable across filesystems and `git` configurations; the
 * canonical Communitas weekday names include `versöhnung` which we map to
 * `versoehnung` on disk. This fold is the only translation between the
 * in-memory enum and the on-disk pool.
 */
function weekdayToFilenameStem(weekday: CommunitasWeekday): string {
  return weekday
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function tryPool(
  contentRoot: string,
  kind: AnchorKind,
  schaleKey: string,
  weekday: CommunitasWeekday,
  today: Date
): string | null {
  const dir = path.join(contentRoot, 'anchors', kind, schaleKey);
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const stem = weekdayToFilenameStem(weekday);
  const matches = entries
    .filter((n) => {
      if (!n.endsWith('.md')) return false;
      const lower = n.toLowerCase();
      // Accept both ASCII-folded (versoehnung) and direct (versöhnung) names.
      return lower.startsWith(stem) || lower.startsWith(weekday.toLowerCase());
    })
    .sort((a, b) => a.localeCompare(b));
  if (matches.length === 0) return null;
  const idx = dayOfYearUTC(today) % matches.length;
  return path.join(dir, matches[idx]);
}
