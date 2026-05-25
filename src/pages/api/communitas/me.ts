import type { APIRoute } from 'astro';
import { sql } from '../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../lib/communitas/auth';
import { getCommunitasWeekday, isMiddayActiveDay } from '../../../lib/communitas/schedule';
import { localDateInZone } from '../../../lib/communitas/cron-helpers';

export const prerender = false;

interface MemberRow {
  id: number;
  display_name: string;
  current_schale_key: string;
  german_name: string;
  in_threshold_until: Date | null;
  joined_on: Date;
  timezone: string;
  tier: string | null;
}

/**
 * GET /api/communitas/me — own profile + today's anchor status.
 *
 * Requires a valid `communitas_session` cookie.
 *
 * The `tier` field is derived from the most recent ACTIVE subscription row
 * (status='active'); if none, we return 'none'. The four-voice/Phase-6
 * `kreis_id` is null until Phase 7 wires Briefkreise.
 */
export const GET: APIRoute = async ({ request }) => {
  let session;
  try {
    session = await requireMember(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), {
        status: err.status,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw err;
  }

  let row: MemberRow | null = null;
  try {
    const rows = await sql<MemberRow[]>`
      SELECT
        m.id,
        m.display_name,
        m.current_schale_key,
        s.german_name,
        m.in_threshold_until,
        m.joined_on,
        m.timezone,
        (
          SELECT tier
          FROM subscriptions
          WHERE member_id = m.id AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        ) AS tier
      FROM members m
      JOIN schales s ON s.key = m.current_schale_key
      WHERE m.id = ${session.memberId}
      LIMIT 1
    `;
    if (rows.length > 0) row = rows[0];
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, code: 'upstream_error', detail: (err as Error).message }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  if (!row) {
    return new Response(JSON.stringify({ ok: false, code: 'not_found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Compute today in the member's timezone
  const localDate = localDateInZone(new Date(), row.timezone);
  const todayDate = new Date(localDate + 'T12:00:00Z');
  const weekday = getCommunitasWeekday(todayDate);

  // Look up which anchors have been sent today (UTC date in member tz)
  let sentAnkers: string[] = [];
  try {
    const rows = await sql<{ anker_type: string }[]>`
      SELECT DISTINCT anker_type
      FROM anker_sent_log
      WHERE member_id = ${session.memberId}
        AND scheduled_for = ${localDate}::date
    `;
    sentAnkers = rows.map((r) => r.anker_type);
  } catch {
    // Tolerate missing log table during transient errors; default to empty.
  }

  const expected: string[] = ['morning', 'evening'];
  if (isMiddayActiveDay(todayDate)) expected.push('noon');

  const received = expected.filter((a) => sentAnkers.includes(a));
  const pending = expected.filter((a) => !sentAnkers.includes(a));

  const body = {
    member: {
      display_name: row.display_name,
      tier: row.tier ?? 'none',
      current_schale: {
        key: row.current_schale_key,
        german_name: row.german_name,
      },
      in_threshold_until: row.in_threshold_until
        ? new Date(row.in_threshold_until).toISOString().slice(0, 10)
        : null,
      kreis_id: null as number | null, // Phase 7
      joined_on: new Date(row.joined_on).toISOString().slice(0, 10),
    },
    today: {
      weekday,
      anchors_received: received,
      anchors_pending: pending,
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
