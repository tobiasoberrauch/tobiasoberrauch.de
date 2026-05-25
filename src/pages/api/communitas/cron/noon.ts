import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { sendBatched, type MailParams } from '../../../../lib/communitas/mailer';
import { getCommunitasWeekday, isMiddayActiveDay } from '../../../../lib/communitas/schedule';
import {
  isPhaseOneZone,
  localDateInZone,
  localHourInZone,
} from '../../../../lib/communitas/cron-helpers';
import noonTemplate from '../../../../lib/communitas/email-templates/noon';

export const prerender = false;

interface MemberRow {
  id: number;
  email: string;
  display_name: string;
  current_schale_key: string;
  timezone: string;
  in_threshold_until: Date | null;
}

/**
 * GET /api/communitas/cron/noon
 *
 * Vercel-Cron on Mo/Mi/Fr at 10:00 UTC. Sends the midday audio link.
 * Tu/Do/Sa/So are explicit silence — early-exit if the global cron is
 * triggered on those days.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const expected = process.env.CRON_SECRET;
  const got = request.headers.get('authorization') ?? '';
  if (!expected || got !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Use UTC date for the global guard; per-member checks happen below.
  const now = new Date();
  if (!isMiddayActiveDay(now)) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 'midday-quiet-day' }), {
      status: 200,
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

  const origin = new URL(url).origin;
  const toSend: { row: MemberRow; localDate: string; mail: MailParams }[] = [];
  let skipped = 0;

  for (const m of members) {
    if (!isPhaseOneZone(m.timezone)) {
      skipped++;
      continue;
    }
    const hour = localHourInZone(now, m.timezone);
    if (hour < 12 || hour > 14) {
      skipped++;
      continue;
    }
    const localDate = localDateInZone(now, m.timezone);
    const todayDate = new Date(localDate + 'T12:00:00Z');
    if (!isMiddayActiveDay(todayDate)) {
      skipped++;
      continue;
    }
    const weekday = getCommunitasWeekday(todayDate);
    // weekday will be one of spiegel/spur/versöhnung; the on-disk audio uses
    // ASCII so we map versöhnung → versoehnung for the URL.
    const weekdayStem = weekday
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue');
    const audioUrl = `${origin}/media/cotidianum/${m.current_schale_key}/${weekdayStem}.mp3`;

    let claimed = false;
    try {
      const inserted = await sql<{ id: number }[]>`
        INSERT INTO anker_sent_log (member_id, anker_type, scheduled_for, schedule_slot, content_ref)
        VALUES (
          ${m.id},
          'noon',
          ${localDate}::date,
          ${'noon-' + localDate},
          ${m.current_schale_key + '/' + weekdayStem + '.mp3'}
        )
        ON CONFLICT (member_id, anker_type, scheduled_for) DO NOTHING
        RETURNING id
      `;
      claimed = inserted.length > 0;
    } catch (err) {
      console.warn('[cron:noon] claim failed', m.id, (err as Error).message);
      skipped++;
      continue;
    }
    if (!claimed) {
      skipped++;
      continue;
    }

    const html = noonTemplate({ audio_url: audioUrl });
    toSend.push({
      row: m,
      localDate,
      mail: { to: m.email, subject: 'Mittag.', html },
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
    try {
      await sql`
        DELETE FROM anker_sent_log
        WHERE member_id = ${ctx.row.id}
          AND anker_type = 'noon'
          AND scheduled_for = ${ctx.localDate}::date
      `;
    } catch {
      /* ignore */
    }
    console.warn('[cron:noon] send failed for member_id=', ctx.row.id, r.code);
  }

  return new Response(JSON.stringify({ ok: true, sent, skipped, errors }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
