/**
 * POST /api/communitas/admin/scholarships/grant
 *
 * Phase 5 / US3 / T079.
 *
 * Companion-only. Records a scholarship grant for a recipient and either
 * upgrades their existing subscription to status='scholarship' or, if
 * none exists, inserts a new Voll-tier `scholarship` subscription.
 *
 * Anonymity invariant (research.md §10): no FK between
 * `scholarship_pool_contributions` and `scholarship_grants`. The grant
 * row carries `recipient_member_id`; pool contributions never reference
 * a member. The two-sided anonymity (Spec SC-007) is preserved by
 * absence of any join key.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../../lib/communitas/auth';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface GrantBody {
  recipient_member_id: number;
  grant_year: number;
  approved_by_three: boolean;
  notes?: string;
}

function validate(raw: unknown): GrantBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const rid = Number(r.recipient_member_id);
  const year = Number(r.grant_year);
  const approved = r.approved_by_three === true;
  if (!Number.isFinite(rid) || rid <= 0) return null;
  if (!Number.isFinite(year) || year < 2026 || year > 2100) return null;
  const notes = typeof r.notes === 'string' ? r.notes : undefined;
  return {
    recipient_member_id: rid,
    grant_year: year,
    approved_by_three: approved,
    notes,
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    await requireCompanion(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, {
        ok: false,
        code: err.status === 401 ? 'unauthorized' : 'forbidden',
      });
    }
    return json(401, { ok: false, code: 'unauthorized' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'body' });
  }
  const v = validate(body);
  if (!v) {
    return json(400, { ok: false, code: 'validation_error' });
  }
  if (!v.approved_by_three) {
    // Spec data-model.md: requires `approved_by_three=true` set only
    // after three companion signatures collected. We refuse the row
    // until that flag is true.
    return json(400, {
      ok: false,
      code: 'validation_error',
      field: 'approved_by_three',
      detail: 'three_companion_signatures_required',
    });
  }

  // Ensure recipient exists.
  const memberRows = await sql<{ id: number }[]>`
    SELECT id FROM members WHERE id = ${v.recipient_member_id} LIMIT 1
  `;
  if (memberRows.length === 0) {
    return json(404, { ok: false, code: 'not_found' });
  }

  // Reject if recipient already has an active/scholarship subscription
  // in the same year.
  const conflict = await sql<{ id: number }[]>`
    SELECT id FROM subscriptions
    WHERE member_id = ${v.recipient_member_id}
      AND status IN ('active', 'past_due', 'scholarship', 'paused')
      AND EXTRACT(year FROM current_period_end)::int = ${v.grant_year}
    LIMIT 1
  `;
  // We allow grants when there's no concurrent paid subscription. If one
  // exists, refuse — a grant shouldn't double up on top of a paid year.
  if (conflict.length > 0) {
    return json(400, {
      ok: false,
      code: 'validation_error',
      field: 'recipient_member_id',
      detail: 'active_subscription_exists',
    });
  }

  // Insert the grant.
  const grantRows = await sql<{ id: number }[]>`
    INSERT INTO scholarship_grants (
      grant_year, recipient_member_id, approved_by_three, notes
    ) VALUES (
      ${v.grant_year}, ${v.recipient_member_id}, true, ${v.notes ?? null}
    )
    RETURNING id
  `;
  const grantId = Number(grantRows[0].id);

  // Insert a scholarship subscription for the recipient (Voll tier).
  const periodStart = new Date(Date.UTC(v.grant_year, 0, 1))
    .toISOString()
    .slice(0, 10);
  const periodEnd = new Date(Date.UTC(v.grant_year, 11, 31))
    .toISOString()
    .slice(0, 10);
  await sql`
    INSERT INTO subscriptions (
      member_id, tier, stripe_subscription_id, stripe_customer_id,
      yearly_amount_cents, current_period_start, current_period_end,
      status, scholarship_grant_id
    ) VALUES (
      ${v.recipient_member_id}, 'voll', NULL, NULL,
      360000, ${periodStart}, ${periodEnd},
      'scholarship', ${grantId}
    )
  `;

  return json(200, { ok: true, grant_id: grantId });
};
