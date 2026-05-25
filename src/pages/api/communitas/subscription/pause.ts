/**
 * POST /api/communitas/subscription/pause
 *
 * Phase 5 / US3 / T076b.
 *
 * Pause the caller's active subscription. Mirrors the Stripe-side pause
 * (`pause_collection: { behavior: 'mark_uncollectible' }`) so the member
 * does not get charged while paused. Status moves to 'paused' in our DB
 * (no anchor mails are sent to paused members — Spec FR-021ish).
 *
 * Resuming is currently a manual operation by Tobias/Begleiter via SQL
 * (not in scope of Phase 5).
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let session;
  try {
    session = await requireMember(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, { ok: false, code: 'unauthorized' });
    }
    return json(401, { ok: false, code: 'unauthorized' });
  }

  const rows = await sql<
    { id: number; stripe_subscription_id: string | null }[]
  >`
    SELECT id, stripe_subscription_id
    FROM subscriptions
    WHERE member_id = ${session.memberId}
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (rows.length === 0) {
    return json(404, { ok: false, code: 'not_found' });
  }
  const sub = rows[0];

  await sql`
    UPDATE subscriptions SET status = 'paused' WHERE id = ${sub.id}
  `;

  if (sub.stripe_subscription_id) {
    try {
      const { getStripe } = await import('../../../../lib/communitas/stripe');
      await getStripe().subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: { behavior: 'mark_uncollectible' },
      });
    } catch (err) {
      console.warn(
        '[subscription/pause] stripe update failed',
        session.memberId,
        (err as Error).message,
      );
    }
  }

  return json(200, { ok: true, status: 'paused' });
};
