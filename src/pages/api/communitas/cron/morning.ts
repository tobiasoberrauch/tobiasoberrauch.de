import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import { sql } from '../../../../lib/communitas/db';
import { sendBatched, type MailParams } from '../../../../lib/communitas/mailer';
import {
  getCommunitasWeekday,
  pickAnchorForSchaleAndWeekday,
} from '../../../../lib/communitas/schedule';
import {
  getContentRoot,
  isPhaseOneZone,
  localDateInZone,
  localHourInZone,
  parseAnchorMarkdown,
  truncateSubject,
} from '../../../../lib/communitas/cron-helpers';
import morningTemplate from '../../../../lib/communitas/email-templates/morning';

export const prerender = false;

const WEEKDAY_LABELS: Record<string, string> = {
  spiegel: 'Spiegel',
  stille: 'Stille',
  spur: 'Spur',
  begegnung: 'Begegnung',
  versöhnung: 'Versöhnung',
  werk: 'Werk',
  sammlung: 'Sammlung',
};

interface MemberRow {
  id: number;
  email: string;
  display_name: string;
  current_schale_key: string;
  timezone: string;
  in_threshold_until: Date | null;
}

/**
 * GET /api/communitas/cron/morning
 *
 * Vercel-Cron daily at 04:00 UTC. Iterates active members; for each whose
 * local hour is 6, 7, or 8 right now, attempts to claim a row in
 * `anker_sent_log` (idempotency), renders template 5, sends.
 *
 * Phase-1 (DACH only): non-Europe timezones are skipped with reason logged.
 */
export const GET: APIRoute = async ({ request }) => {
  const expected = process.env.CRON_SECRET;
  const got = request.headers.get('authorization') ?? '';
  if (!expected || got !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let members: MemberRow[] = [];
  try {
    members = await sql<MemberRow[]>`
      SELECT id, email, display_name, current_schale_key, timezone, in_threshold_until
      FROM members
      WHERE left_on IS NULL
        AND paused_until IS NULL
    `;
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, code: 'upstream_error', detail: (err as Error).message }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const now = new Date();
  const contentRoot = getContentRoot();
  const toSend: { row: MemberRow; localDate: string; mail: MailParams }[] = [];
  let skipped = 0;

  for (const m of members) {
    if (!isPhaseOneZone(m.timezone)) {
      console.info('[cron:morning] skip non-european tz', m.id);
      skipped++;
      continue;
    }
    const hour = localHourInZone(now, m.timezone);
    if (hour < 6 || hour > 8) {
      skipped++;
      continue;
    }
    const localDate = localDateInZone(now, m.timezone);
    const todayDate = new Date(localDate + 'T12:00:00Z');
    const weekday = getCommunitasWeekday(todayDate);

    // Idempotency: try to claim the slot. ON CONFLICT DO NOTHING + RETURNING
    // gives us the only-send-if-newly-inserted semantics we want.
    const anchorPath = pickAnchorForSchaleAndWeekday(
      m.current_schale_key,
      weekday,
      'morning',
      contentRoot,
      todayDate,
    );
    if (!anchorPath) {
      console.warn('[cron:morning] no content for', m.current_schale_key, weekday);
      skipped++;
      continue;
    }

    let md = '';
    try {
      md = await fs.readFile(anchorPath, 'utf8');
    } catch (err) {
      console.warn('[cron:morning] read failed', (err as Error).message);
      skipped++;
      continue;
    }
    const parsed = parseAnchorMarkdown(md);
    if (parsed.isPlaceholder) {
      skipped++;
      continue;
    }

    const inThreshold =
      m.in_threshold_until !== null &&
      new Date(m.in_threshold_until).getTime() >= todayDate.getTime();

    // Schwellenritus: reduced anchor — verse only, no question.
    const question = inThreshold ? '' : parsed.question;
    const verse = parsed.verse;

    if (!question && !verse) {
      skipped++;
      continue;
    }

    // Claim the slot
    let claimed = false;
    try {
      const inserted = await sql<{ id: number }[]>`
        INSERT INTO anker_sent_log (member_id, anker_type, scheduled_for, schedule_slot, content_ref)
        VALUES (
          ${m.id},
          'morning',
          ${localDate}::date,
          ${'morning-' + localDate},
          ${anchorPath.split('/').slice(-3).join('/')}
        )
        ON CONFLICT (member_id, anker_type, scheduled_for) DO NOTHING
        RETURNING id
      `;
      claimed = inserted.length > 0;
    } catch (err) {
      console.warn('[cron:morning] claim failed', m.id, (err as Error).message);
      skipped++;
      continue;
    }
    if (!claimed) {
      skipped++;
      continue;
    }

    const dateLabel = todayDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const html = morningTemplate({
      name: m.display_name,
      verse,
      question,
      weekday_label: WEEKDAY_LABELS[weekday] ?? weekday,
      date_label: dateLabel,
    });
    const subject = question
      ? truncateSubject(question)
      : truncateSubject(verse.replace(/\n/g, ' ').replace(/[*]/g, '').trim());

    toSend.push({
      row: m,
      localDate,
      mail: {
        to: m.email,
        subject,
        html,
      },
    });
  }

  const results = await sendBatched(toSend.map((t) => t.mail));
  let sent = 0;
  let errors = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const ctx = toSend[i];
    if (r.ok || r.code === 'not_configured') {
      sent++;
      continue;
    }
    errors++;
    // Roll back the log row so the next cron pass can retry.
    try {
      await sql`
        DELETE FROM anker_sent_log
        WHERE member_id = ${ctx.row.id}
          AND anker_type = 'morning'
          AND scheduled_for = ${ctx.localDate}::date
      `;
    } catch (err) {
      console.warn('[cron:morning] rollback failed', ctx.row.id, (err as Error).message);
    }
    console.warn('[cron:morning] send failed for member_id=', ctx.row.id, r.code);
  }

  return new Response(JSON.stringify({ ok: true, sent, skipped, errors }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
