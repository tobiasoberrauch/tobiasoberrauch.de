/**
 * POST /api/communitas/stripe/checkout
 *
 * Phase 5 / US3 / T070.
 *
 * Authenticated endpoint. Returns a Stripe Checkout URL the client can
 * redirect to. We intentionally do not embed any Stripe.js — the member
 * is redirected to the hosted page.
 *
 * Inner Circle gate (Spec assumption "Inner-Circle-Zugang", §I): the
 * member's application row must have `desired_tier='inner_circle'` AND
 * `status='accepted'`. Without that gate the endpoint refuses
 * `403 inner_circle_requires_invitation`.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';
import { createCheckoutSession, type Tier } from '../../../../lib/communitas/stripe';

export const prerender = false;

const TIERS = new Set<Tier>(['basis', 'voll', 'inner_circle']);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // ----- Auth ------------------------------------------------------------
  let session;
  try {
    session = await requireMember(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, { ok: false, code: 'unauthorized' });
    }
    return json(401, { ok: false, code: 'unauthorized' });
  }

  // ----- Parse + validate body ------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'tier' });
  }
  const tierRaw = (body as { tier?: unknown })?.tier;
  if (typeof tierRaw !== 'string' || !TIERS.has(tierRaw as Tier)) {
    return json(400, { ok: false, code: 'validation_error', field: 'tier' });
  }
  const tier = tierRaw as Tier;

  // ----- Load member email + IC gate ------------------------------------
  let memberEmail: string;
  try {
    const rows = await sql<
      { email: string; ic_application_count: number }[]
    >`
      SELECT
        m.email,
        (
          SELECT count(*) FROM applications a
          WHERE a.applicant_email = m.email
            AND a.desired_tier = 'inner_circle'
            AND a.status = 'accepted'
        )::int AS ic_application_count
      FROM members m
      WHERE m.id = ${session.memberId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return json(404, { ok: false, code: 'not_found' });
    }
    memberEmail = rows[0].email;
    if (tier === 'inner_circle' && Number(rows[0].ic_application_count) < 1) {
      // Spec: Inner Circle ist nur nach gesondertem 90–120 min Gespräch
      // mit Tobias zugänglich. Ohne accepted IC-application — kein
      // Checkout.
      return json(403, {
        ok: false,
        code: 'inner_circle_requires_invitation',
      });
    }
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'not_configured',
      detail: (err as Error).message,
    });
  }

  // ----- Build Checkout Session -----------------------------------------
  try {
    const { url } = await createCheckoutSession({
      memberId: session.memberId,
      memberEmail,
      tier,
    });
    if (!url) {
      return json(502, { ok: false, code: 'upstream_error' });
    }
    return json(200, { url });
  } catch (err) {
    const msg = (err as Error).message;
    if (
      msg.includes('STRIPE_SECRET_KEY missing') ||
      msg.startsWith('Price not configured')
    ) {
      return json(503, { ok: false, code: 'not_configured', detail: msg });
    }
    return json(502, { ok: false, code: 'upstream_error', detail: msg });
  }
};
