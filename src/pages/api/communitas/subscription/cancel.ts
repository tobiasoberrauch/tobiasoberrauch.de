/**
 * GET|POST /api/communitas/subscription/cancel
 *
 * Phase 5 / US3 / T075.
 *
 * Two auth modes:
 *   1) Session-based POST from the Konto page (logged-in member).
 *   2) Token-based GET from the renewal-reminder email (one-click).
 *
 * Result in both cases: `cancel_at_period_end = true` (DB + Stripe).
 * Spec FR-019: no "Are you sure?", no retention flow. The GET path
 * returns a quiet HTML page; the POST path returns JSON.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { getSession } from '../../../../lib/communitas/auth';
import { verifyCancelToken } from '../../../../lib/communitas/cancel-token';

export const prerender = false;

interface SubscriptionRow {
  id: number;
  member_id: number;
  stripe_subscription_id: string | null;
  current_period_end: Date;
}

async function loadActiveSubscriptionForMember(
  memberId: number,
): Promise<SubscriptionRow | null> {
  const rows = await sql<SubscriptionRow[]>`
    SELECT id, member_id, stripe_subscription_id, current_period_end
    FROM subscriptions
    WHERE member_id = ${memberId}
      AND status IN ('active', 'past_due')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function loadSubscriptionById(
  subscriptionId: number,
): Promise<SubscriptionRow | null> {
  const rows = await sql<SubscriptionRow[]>`
    SELECT id, member_id, stripe_subscription_id, current_period_end
    FROM subscriptions
    WHERE id = ${subscriptionId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function applyCancellation(sub: SubscriptionRow): Promise<void> {
  await sql`
    UPDATE subscriptions SET cancel_at_period_end = true WHERE id = ${sub.id}
  `;
  if (sub.stripe_subscription_id) {
    try {
      const { getStripe } = await import('../../../../lib/communitas/stripe');
      await getStripe().subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (err) {
      // Log only — DB is the source of truth, and the next webhook will
      // reconcile if Stripe sees the change later.
      console.warn(
        '[subscription/cancel] stripe update failed',
        sub.member_id,
        (err as Error).message,
      );
    }
  }
}

function quietHtmlPage(endsOn: string): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Communitas Cotidiana — Gehen</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
</head>
<body style="margin:0;padding:4rem 1.25rem;background:#fefefe;color:#1c1917;font-family:Georgia,'Times New Roman',Times,serif;font-size:18px;line-height:1.6;">
  <main style="max-width:38rem;margin:0 auto;">
    <p style="margin:0 0 1.5em;">Wir tragen einander, ohne uns festzuhalten.</p>
    <p style="margin:0 0 1.5em;">Deine Mitgliedschaft endet am ${endsOn}.</p>
    <p style="margin:2.5em 0 0;color:#78716c;font-size:0.92em;">In Stille,<br/>Tobias</p>
  </main>
</body>
</html>`;
}

async function resolveSubscription(
  request: Request,
  url: URL,
): Promise<{ ok: true; sub: SubscriptionRow } | { ok: false; status: number; body: unknown }> {
  // Try session first.
  const session = await getSession(request).catch(() => null);
  if (session) {
    const sub = await loadActiveSubscriptionForMember(session.memberId);
    if (!sub) {
      return { ok: false, status: 404, body: { ok: false, code: 'not_found' } };
    }
    return { ok: true, sub };
  }
  // Fall back to token.
  const token = url.searchParams.get('token') ?? url.searchParams.get('t') ?? '';
  if (!token) {
    return { ok: false, status: 401, body: { ok: false, code: 'unauthorized' } };
  }
  const payload = verifyCancelToken(token);
  if (!payload) {
    return { ok: false, status: 401, body: { ok: false, code: 'unauthorized' } };
  }
  const sub = await loadSubscriptionById(payload.subscriptionId);
  if (!sub) {
    return { ok: false, status: 404, body: { ok: false, code: 'not_found' } };
  }
  return { ok: true, sub };
}

export const GET: APIRoute = async ({ request, url }) => {
  const resolved = await resolveSubscription(request, url);
  if (!resolved.ok) {
    return new Response(JSON.stringify(resolved.body), {
      status: resolved.status,
      headers: { 'content-type': 'application/json' },
    });
  }
  await applyCancellation(resolved.sub);
  const endsOn = new Date(resolved.sub.current_period_end).toLocaleDateString(
    'de-DE',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );
  return new Response(quietHtmlPage(endsOn), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
};

export const POST: APIRoute = async ({ request, url }) => {
  const resolved = await resolveSubscription(request, url);
  if (!resolved.ok) {
    return new Response(JSON.stringify(resolved.body), {
      status: resolved.status,
      headers: { 'content-type': 'application/json' },
    });
  }
  await applyCancellation(resolved.sub);
  return new Response(
    JSON.stringify({
      ok: true,
      ends_on: new Date(resolved.sub.current_period_end)
        .toISOString()
        .slice(0, 10),
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
};
