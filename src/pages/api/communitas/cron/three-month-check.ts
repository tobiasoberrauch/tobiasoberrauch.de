import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { sendBatched, type MailParams } from '../../../../lib/communitas/mailer';
import quietCheckTemplate from '../../../../lib/communitas/email-templates/quiet-check';

export const prerender = false;

interface MemberRow {
  id: number;
  email: string;
  display_name: string;
}

/**
 * GET /api/communitas/cron/three-month-check
 *
 * Vercel-Cron weekly Sunday 12:00 UTC. Selects members who have had no
 * detectable activity in the past 90 days (no cell entries, no kreis
 * messages, no retreat bookings) and who have not received this gentle
 * check in the past 180 days. Sends template 9 verbatim.
 *
 * Important: this is NOT a re-engagement campaign. It runs at most twice
 * per year per member. The wording is the exact text from the spec; no
 * paraphrase, no UTM, no follow-up.
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

  let candidates: MemberRow[] = [];
  try {
    candidates = await sql<MemberRow[]>`
      SELECT m.id, m.email, m.display_name
      FROM members m
      WHERE m.left_on IS NULL
        AND m.paused_until IS NULL
        AND (m.last_quiet_check_at IS NULL OR m.last_quiet_check_at < now() - interval '180 days')
        AND NOT EXISTS (
          SELECT 1 FROM cell_entries c
          WHERE c.member_id = m.id AND c.created_at > now() - interval '90 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM kreis_messages k
          WHERE k.author_id = m.id AND k.sent_at > now() - interval '90 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM retreat_bookings r
          WHERE r.member_id = m.id AND r.booked_at > now() - interval '90 days'
        )
        AND m.joined_on < current_date - interval '90 days'
    `;
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, code: 'upstream_error', detail: (err as Error).message }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const messages: MailParams[] = candidates.map((m) => ({
    to: m.email,
    subject: 'Wir denken an dich.',
    html: quietCheckTemplate({ name: m.display_name }),
  }));

  const results = await sendBatched(messages);
  let sent = 0;
  let errors = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const m = candidates[i];
    if (r.ok || r.code === 'not_configured') {
      sent++;
      try {
        await sql`
          UPDATE members SET last_quiet_check_at = now() WHERE id = ${m.id}
        `;
      } catch (err) {
        console.warn('[cron:three-month-check] mark failed', m.id, (err as Error).message);
      }
      continue;
    }
    errors++;
    console.warn('[cron:three-month-check] send failed for member_id=', m.id, r.code);
  }

  return new Response(JSON.stringify({ ok: true, sent, errors }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
