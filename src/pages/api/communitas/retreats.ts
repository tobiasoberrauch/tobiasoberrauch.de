/**
 * GET /api/communitas/retreats
 *
 * Phase 8 / T105.
 *
 * Lists upcoming retreats and the tier-specific price for the calling
 * member (Spec FR-031):
 *   - Inner Circle (and NORDSTERN, when introduced): €0 (included)
 *   - Voll:  base_price_cents + voll_surcharge_cents (default €1800)
 *   - Basis: base_price_cents (full self-cost)
 *
 * The endpoint also marks `already_booked` per retreat so the caller's UI
 * can render „Du bist angemeldet." without a second round-trip.
 *
 * Privacy: we never log or return other members' booking info. `booked_count`
 * is an aggregate, not a list.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../lib/communitas/auth';
import {
  priceForMemberCents,
  type ActiveTier,
} from '../../../lib/communitas/retreats';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface RetreatRow {
  id: number;
  kind: string;
  title: string;
  location: string;
  start_date: Date | string;
  end_date: Date | string;
  max_participants: number;
  base_price_cents: number;
  voll_surcharge_cents: number | null;
  cancelled_at: Date | null;
  cancellation_note: string | null;
  booked_count: number;
  already_booked: boolean;
}

function isoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

async function getActiveTier(memberId: number): Promise<ActiveTier> {
  const rows = await sql<{ tier: string }[]>`
    SELECT tier FROM subscriptions
    WHERE member_id = ${memberId}
      AND status IN ('active', 'scholarship')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const t = rows[0].tier;
  if (t === 'basis' || t === 'voll' || t === 'inner_circle') return t;
  return null;
}

export const GET: APIRoute = async ({ request }) => {
  let memberId: number;
  try {
    const s = await requireMember(request);
    memberId = s.memberId;
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, {
        ok: false,
        code: err.status === 401 ? 'unauthorized' : 'forbidden',
      });
    }
    return json(401, { ok: false, code: 'unauthorized' });
  }

  let tier: ActiveTier;
  try {
    tier = await getActiveTier(memberId);
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'upstream_error',
      detail: (err as Error).message,
    });
  }

  let rows: RetreatRow[] = [];
  try {
    rows = await sql<RetreatRow[]>`
      SELECT
        r.id,
        r.kind,
        r.title,
        r.location,
        r.start_date,
        r.end_date,
        r.max_participants,
        r.base_price_cents,
        r.voll_surcharge_cents,
        r.cancelled_at,
        r.cancellation_note,
        (
          SELECT COUNT(*)::int FROM retreat_bookings rb
          WHERE rb.retreat_id = r.id AND rb.cancelled_at IS NULL
        ) AS booked_count,
        EXISTS (
          SELECT 1 FROM retreat_bookings rb2
          WHERE rb2.retreat_id = r.id
            AND rb2.member_id = ${memberId}
            AND rb2.cancelled_at IS NULL
        ) AS already_booked
      FROM retreats r
      WHERE r.start_date >= current_date
      ORDER BY r.start_date ASC
    `;
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'upstream_error',
      detail: (err as Error).message,
    });
  }

  const retreats = rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind,
    title: r.title,
    location: r.location,
    start_date: isoDate(r.start_date),
    end_date: isoDate(r.end_date),
    max_participants: r.max_participants,
    booked_count: Number(r.booked_count),
    price_for_member_cents: priceForMemberCents(
      tier,
      Number(r.base_price_cents),
      r.voll_surcharge_cents == null ? null : Number(r.voll_surcharge_cents),
    ),
    cancelled: r.cancelled_at != null,
    cancellation_note: r.cancellation_note,
    already_booked: Boolean(r.already_booked),
  }));

  return json(200, { ok: true, tier, retreats });
};
