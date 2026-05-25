import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { sendBatched, type MailParams } from '../../../../lib/communitas/mailer';
import {
  isPhaseOneZone,
  localDateInZone,
  localHourInZone,
} from '../../../../lib/communitas/cron-helpers';
import eveningTemplate from '../../../../lib/communitas/email-templates/evening';

export const prerender = false;

interface MemberRow {
  id: number;
  email: string;
  display_name: string;
  timezone: string;
  tier: string | null;
}

/**
 * GET /api/communitas/cron/evening
 *
 * Vercel-Cron daily at 19:00 UTC. Sends template 7 (three fixed questions).
 * Voll/InnerCircle members get an appended Zelle link; Basis members do not.
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

  let members: MemberRow[] = [];
  try {
    members = await sql<MemberRow[]>`
      SELECT
        m.id,
        m.email,
        m.display_name,
        m.timezone,
        (
          SELECT tier FROM subscriptions
          WHERE member_id = m.id AND status = 'active'
          ORDER BY created_at DESC LIMIT 1
        ) AS tier
      FROM members m
      WHERE m.left_on IS NULL
        AND m.paused_until IS NULL
    `;
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, code: 'upstream_error', detail: (err as Error).message }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const now = new Date();
  const origin = new URL(url).origin;
  const toSend: { row: MemberRow; localDate: string; mail: MailParams }[] = [];
  let skipped = 0;

  for (const m of members) {
    if (!isPhaseOneZone(m.timezone)) {
      skipped++;
      continue;
    }
    const hour = localHourInZone(now, m.timezone);
    if (hour < 21 || hour > 23) {
      skipped++;
      continue;
    }
    const localDate = localDateInZone(now, m.timezone);

    let claimed = false;
    try {
      const inserted = await sql<{ id: number }[]>`
        INSERT INTO anker_sent_log (member_id, anker_type, scheduled_for, schedule_slot, content_ref)
        VALUES (
          ${m.id},
          'evening',
          ${localDate}::date,
          ${'evening-' + localDate},
          'evening.md'
        )
        ON CONFLICT (member_id, anker_type, scheduled_for) DO NOTHING
        RETURNING id
      `;
      claimed = inserted.length > 0;
    } catch (err) {
      console.warn('[cron:evening] claim failed', m.id, (err as Error).message);
      skipped++;
      continue;
    }
    if (!claimed) {
      skipped++;
      continue;
    }

    const cellUrl =
      m.tier === 'voll' || m.tier === 'inner_circle'
        ? `${origin}/communitas-mitglied/zelle`
        : undefined;
    const html = eveningTemplate({ cell_url: cellUrl });
    toSend.push({
      row: m,
      localDate,
      mail: { to: m.email, subject: 'Drei Fragen.', html },
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
          AND anker_type = 'evening'
          AND scheduled_for = ${ctx.localDate}::date
      `;
    } catch {
      /* ignore */
    }
    console.warn('[cron:evening] send failed for member_id=', ctx.row.id, r.code);
  }

  return new Response(JSON.stringify({ ok: true, sent, skipped, errors }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
