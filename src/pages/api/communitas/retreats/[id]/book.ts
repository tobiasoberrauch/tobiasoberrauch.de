/**
 * POST /api/communitas/retreats/[id]/book
 *
 * Phase 8 / T106.
 *
 * Books the calling member into a retreat (Spec FR-031).
 *
 *   - If the computed price is €0 (Inner Circle / NORDSTERN):
 *     insert booking directly, send retreat-confirmation mail,
 *     return { booked: true, retreat_booking_id }.
 *
 *   - Otherwise: create a Stripe Checkout Session in `mode: 'payment'`
 *     (one-time charge, NOT subscription), with metadata identifying the
 *     retreat. Return { stripe_checkout_url }. The webhook (Phase 5,
 *     extended in T106) inserts the booking row + sends the confirmation
 *     when `checkout.session.completed` fires for `mode === 'payment'`.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../../lib/communitas/auth';
import { getStripe } from '../../../../../lib/communitas/stripe';
import { sendMail } from '../../../../../lib/communitas/mailer';
import retreatConfirmation from '../../../../../lib/communitas/email-templates/retreat-confirmation';
import {
  priceForMemberCents,
  type ActiveTier,
} from '../../../../../lib/communitas/retreats';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface RetreatRow {
  id: number;
  title: string;
  location: string;
  start_date: Date | string;
  end_date: Date | string;
  max_participants: number;
  base_price_cents: number;
  voll_surcharge_cents: number | null;
  cancelled_at: Date | null;
  booked_count: number;
}

interface MemberRow {
  email: string;
  display_name: string;
}

function germanDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00Z') : d;
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

export const POST: APIRoute = async ({ request, params }) => {
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

  const retreatId = Number(params.id);
  if (!Number.isFinite(retreatId) || retreatId <= 0) {
    return json(400, { ok: false, code: 'validation_error', field: 'id' });
  }

  // Load retreat + live occupancy + caller's booking status in one go.
  const rows = await sql<RetreatRow[]>`
    SELECT
      r.id, r.title, r.location, r.start_date, r.end_date,
      r.max_participants, r.base_price_cents, r.voll_surcharge_cents,
      r.cancelled_at,
      (
        SELECT COUNT(*)::int FROM retreat_bookings rb
        WHERE rb.retreat_id = r.id AND rb.cancelled_at IS NULL
      ) AS booked_count
    FROM retreats r
    WHERE r.id = ${retreatId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    return json(404, { ok: false, code: 'not_found' });
  }
  const retreat = rows[0];
  if (retreat.cancelled_at) {
    return json(400, { ok: false, code: 'validation_error', detail: 'cancelled' });
  }
  if (Number(retreat.booked_count) >= retreat.max_participants) {
    return json(400, { ok: false, code: 'validation_error', detail: 'full' });
  }

  // Already booked?
  const existing = await sql<{ id: number }[]>`
    SELECT id FROM retreat_bookings
    WHERE retreat_id = ${retreatId}
      AND member_id = ${memberId}
      AND cancelled_at IS NULL
    LIMIT 1
  `;
  if (existing.length > 0) {
    return json(400, { ok: false, code: 'validation_error', detail: 'already_booked' });
  }

  const tier = await getActiveTier(memberId);
  if (!tier) {
    return json(403, { ok: false, code: 'forbidden', detail: 'no_active_subscription' });
  }

  const price = priceForMemberCents(
    tier,
    Number(retreat.base_price_cents),
    retreat.voll_surcharge_cents == null ? null : Number(retreat.voll_surcharge_cents),
  );

  const memberRows = await sql<MemberRow[]>`
    SELECT email, display_name FROM members WHERE id = ${memberId} LIMIT 1
  `;
  if (memberRows.length === 0) {
    return json(404, { ok: false, code: 'not_found', detail: 'member' });
  }
  const member = memberRows[0];

  // ----- Free path (Inner Circle / NORDSTERN) -------------------------
  if (price === 0) {
    const inserted = await sql<{ id: number }[]>`
      INSERT INTO retreat_bookings (retreat_id, member_id, price_paid_cents)
      VALUES (${retreatId}, ${memberId}, 0)
      ON CONFLICT (retreat_id, member_id) DO NOTHING
      RETURNING id
    `;
    if (inserted.length === 0) {
      return json(400, { ok: false, code: 'validation_error', detail: 'already_booked' });
    }
    try {
      await sendMail({
        to: member.email,
        subject: 'Anmeldung bestätigt.',
        html: retreatConfirmation({
          name: member.display_name,
          retreat_title: retreat.title,
          retreat_location: retreat.location,
          start_date_label: germanDate(retreat.start_date),
          end_date_label: germanDate(retreat.end_date),
        }),
      });
    } catch (err) {
      console.warn(
        '[retreats/book] confirmation mail failed for member_id=',
        memberId,
        (err as Error).message,
      );
    }
    return json(200, {
      ok: true,
      booked: true,
      retreat_booking_id: Number(inserted[0].id),
    });
  }

  // ----- Paid path (Basis / Voll) -------------------------------------
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return json(503, { ok: false, code: 'not_configured' });
  }

  const siteUrl = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';
  let url = '';
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['sepa_debit', 'card'],
      locale: 'de',
      customer_email: member.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: price,
            product_data: {
              name: `${retreat.title} — ${retreat.location}`,
              description: `${germanDate(retreat.start_date)} – ${germanDate(retreat.end_date)}`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/communitas-mitglied/reisen?booked=${retreatId}`,
      cancel_url: `${siteUrl}/communitas-mitglied/reisen?cancelled=${retreatId}`,
      client_reference_id: String(memberId),
      metadata: {
        retreat_id: String(retreatId),
        member_id: String(memberId),
        price_paid_cents: String(price),
      },
      allow_promotion_codes: false,
    });
    url = session.url ?? '';
  } catch (err) {
    console.warn(
      '[retreats/book] stripe session failed for retreat_id=',
      retreatId,
      (err as Error).message,
    );
    return json(503, { ok: false, code: 'upstream_error' });
  }

  return json(200, {
    ok: true,
    stripe_checkout_url: url,
    price_cents: price,
  });
};
