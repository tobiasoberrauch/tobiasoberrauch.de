/**
 * Pure helpers shared by the four Cotidianum cron endpoints. Kept here
 * (separate from `schedule.ts`) so they can be unit-tested without spinning
 * up Postgres or Resend.
 *
 * Anything touching the database, the mailer, or the filesystem lives in the
 * cron handlers themselves.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type AnkerType = 'morning' | 'noon' | 'evening';

/**
 * Idempotency check for a single anchor send.
 *
 * Given a member's id, an anchor type, the scheduled DATE in the member's
 * timezone, and the set of dates already logged (`anker_sent_log` rows for
 * the same `member_id`+`anker_type`), return true only if this member should
 * still be sent this anchor today.
 *
 * The real cron handler also relies on `ON CONFLICT (member_id, anker_type,
 * scheduled_for) DO NOTHING RETURNING id` for race-safety; this function is
 * the in-memory pre-filter that keeps us from rendering content for members
 * we already served.
 */
export function shouldSendAnker(
  _memberId: number,
  _ankerType: AnkerType,
  scheduledFor: string,
  alreadyLoggedDates: ReadonlySet<string> | readonly string[],
): boolean {
  const set =
    alreadyLoggedDates instanceof Set
      ? alreadyLoggedDates
      : new Set(alreadyLoggedDates);
  return !set.has(scheduledFor);
}

/**
 * Compute a member's current local hour (0–23) for a given UTC instant and
 * IANA timezone. Uses `Intl.DateTimeFormat` so we avoid an external
 * timezone library — Node 22 ships full ICU data which is sufficient for
 * European timezones.
 */
export function localHourInZone(utcNow: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
  });
  const parts = fmt.formatToParts(utcNow);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl returns "24" for midnight in some hour12:false implementations;
  // normalize to 0.
  const n = Number(h);
  if (!Number.isFinite(n)) return 0;
  return n === 24 ? 0 : n;
}

/**
 * Compute a member's current local date (YYYY-MM-DD) for a given UTC instant
 * and IANA timezone. The returned ISO string is suitable for SQL DATE columns.
 */
export function localDateInZone(utcNow: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA produces YYYY-MM-DD natively.
  return fmt.format(utcNow);
}

/**
 * Phase-1 of Communitas is DACH-only. Non-European timezones are deferred
 * until a second Phase-2 cron-pass exists for the western hemisphere.
 */
export function isPhaseOneZone(timezone: string): boolean {
  return typeof timezone === 'string' && timezone.startsWith('Europe/');
}

/**
 * Resolve the absolute filesystem path of the on-disk content root used by
 * `pickAnchorForSchaleAndWeekday`. Returns `<repo>/src/lib/communitas/content`.
 *
 * Called from the cron handlers (which run with `prerender = false` and have
 * full Node access).
 */
export function getContentRoot(): string {
  // This file lives at src/lib/communitas/cron-helpers.ts; the content root
  // is right next to it.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, 'content');
}

/**
 * Truncate a question to <= 60 characters at the last whole word, no
 * trailing ellipsis. Used as the morning email subject.
 */
export function truncateSubject(question: string, max = 60): string {
  const cleaned = question.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 20) return slice.slice(0, lastSpace).trim();
  return slice.trim();
}

/**
 * Parse a Markdown anchor file into (optional verse, question).
 *
 * Convention:
 *   - Optional 1–2 italic-marked lines (lines starting with `*`) followed by
 *     a blank line form the verse.
 *   - The remaining content is the question. We use the first non-empty
 *     line as the question.
 *
 * If the file is a TODO placeholder (starts with `# TODO:`) we return an
 * empty verse and the placeholder line as the question — callers can then
 * decide to skip the send entirely or use the placeholder as-is.
 */
export function parseAnchorMarkdown(md: string): {
  verse: string;
  question: string;
  isPlaceholder: boolean;
} {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  if (lines[0]?.trim().startsWith('# TODO:')) {
    return { verse: '', question: lines[0].trim(), isPlaceholder: true };
  }

  // Skip leading blank lines.
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  // Verse: only present if the first non-blank line starts with `*`
  // (italic-marked quote). Continue while subsequent lines also start with
  // `*` or with an em-dash attribution (e.g. `— Rilke`).
  const verseLines: string[] = [];
  if (i < lines.length && lines[i].trim().startsWith('*')) {
    while (i < lines.length) {
      const t = lines[i].trim();
      if (t === '') break;
      if (t.startsWith('*') || t.startsWith('—') || t.startsWith('-')) {
        verseLines.push(t);
        i++;
        continue;
      }
      break;
    }
  }

  // Collect the remaining non-empty lines (after the verse, if any).
  const tailLines: string[] = [];
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.length > 0) tailLines.push(t);
  }

  // Question: prefer the last line ending in `?` (the file convention is
  // „optional framing + a single question last"). If none ends in `?`,
  // fall back to the first non-empty line.
  let question = '';
  for (let k = tailLines.length - 1; k >= 0; k--) {
    if (tailLines[k].endsWith('?')) {
      question = tailLines[k];
      break;
    }
  }
  if (!question && tailLines.length > 0) {
    question = tailLines[0];
  }

  const verse = verseLines.join('\n').replace(/^\*+|\*+$/g, '').trim();

  if (!question && verse) {
    // Verse-only file: use verse as the question fallback.
    question = verse;
  }

  return { verse, question, isPlaceholder: false };
}
