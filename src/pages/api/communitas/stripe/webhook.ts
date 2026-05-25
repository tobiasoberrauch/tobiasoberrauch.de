/**
 * POST /api/communitas/stripe/webhook
 *
 * Phase 5 / US3 / T071.
 *
 * Receives Stripe events. The signature is verified against the *raw*
 * request body — we MUST NOT parse JSON before verifying. In Astro that
 * means `await request.text()`.
 *
 * We always reply 200 on signature-valid events even if our downstream
 * processing fails: Stripe will redeliver on non-2xx, and we don't want
 * a transient DB hiccup to cascade into duplicate sends. Failures are
 * logged for inspection.
 *
 * Privacy: we DO NOT log stripe_customer_id or session_id (identifying).
 * We log `member_id` and event type only.
 */
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { sql } from '../../../../lib/communitas/db';
import {
  verifyWebhookSignature,
  tierToCents,
  type Tier,
} from '../../../../lib/communitas/stripe';
import { sendMail } from '../../../../lib/communitas/mailer';
import welcomeTemplate from '../../../../lib/communitas/email-templates/welcome';
import paymentFailedTemplate from '../../../../lib/communitas/email-templates/payment-failed';
import {
  nextSubscriptionState,
  type SubscriptionStatus,
} from '../../../../lib/communitas/subscription-fsm';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return json(400, { ok: false, code: 'validation_error', field: 'stripe-signature' });
  }

  // CRITICAL: raw body, not parsed JSON.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('STRIPE_WEBHOOK_SECRET missing') || msg.includes('STRIPE_SECRET_KEY missing')) {
      return json(503, { ok: false, code: 'not_configured' });
    }
    return json(400, { ok: false, code: 'validation_error', detail: 'bad_signature' });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    // Log only — return 200 so Stripe doesn't retry into a worse state.
    // The next renewal cycle (or manual replay) will reconcile.
    console.warn(
      '[communitas/stripe/webhook] handler error',
      event.type,
      (err as Error).message,
    );
  }

  return json(200, { received: true });
};

// ---------------------------------------------------------------------------
// Event dispatch
// ---------------------------------------------------------------------------

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    case 'invoice.payment_failed':
      return handlePaymentFailed(event.data.object as Stripe.Invoice);
    case 'invoice.payment_succeeded':
      return handlePaymentSucceeded(event.data.object as Stripe.Invoice);
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
      );
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
      );
    default:
      // Spec: ignore everything else (no customer.created etc.).
      return;
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

interface MemberLite {
  id: number;
  email: string;
  display_name: string;
}

async function loadMember(memberId: number): Promise<MemberLite | null> {
  const rows = await sql<MemberLite[]>`
    SELECT id, email, display_name
    FROM members
    WHERE id = ${memberId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function loadSubscriptionByStripeId(
  stripeSubscriptionId: string,
): Promise<{
  id: number;
  member_id: number;
  status: SubscriptionStatus;
  payment_failure_notified_at: Date | null;
} | null> {
  const rows = await sql<
    {
      id: number;
      member_id: number;
      status: SubscriptionStatus;
      payment_failure_notified_at: Date | null;
    }[]
  >`
    SELECT id, member_id, status, payment_failure_notified_at
    FROM subscriptions
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function isTier(value: unknown): value is Tier {
  return value === 'basis' || value === 'voll' || value === 'inner_circle';
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const memberIdStr =
    session.client_reference_id ?? session.metadata?.member_id ?? '';
  const memberId = Number(memberIdStr);
  if (!Number.isFinite(memberId) || memberId <= 0) {
    console.warn('[stripe/webhook] checkout.session.completed without member_id');
    return;
  }
  const tier = session.metadata?.tier;
  if (!isTier(tier)) {
    console.warn(
      '[stripe/webhook] checkout.session.completed unknown tier',
      memberId,
    );
    return;
  }
  if (session.mode !== 'subscription') {
    // Retreat bookings come through as one-time `mode: 'payment'` sessions;
    // they're handled by the retreat booking flow (Phase 8), not here.
    return;
  }
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) {
    console.warn('[stripe/webhook] no subscription on checkout session', memberId);
    return;
  }
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

  // Pull period bounds from the Stripe Subscription resource so we don't
  // have to compute them. Best-effort: if Stripe can't be reached, we fall
  // back to today + 1 year.
  let periodStart = new Date();
  let periodEnd = new Date();
  periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  try {
    // We import lazily to keep the type narrow when env is missing.
    const { getStripe } = await import('../../../../lib/communitas/stripe');
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.current_period_start) {
      periodStart = new Date(sub.current_period_start * 1000);
    }
    if (sub.current_period_end) {
      periodEnd = new Date(sub.current_period_end * 1000);
    }
  } catch (err) {
    console.warn(
      '[stripe/webhook] could not retrieve subscription period',
      memberId,
      (err as Error).message,
    );
  }

  const member = await loadMember(memberId);
  if (!member) {
    console.warn('[stripe/webhook] member not found', memberId);
    return;
  }

  // Idempotency: check if we already have a row.
  const existing = await loadSubscriptionByStripeId(subscriptionId);
  const fsm = nextSubscriptionState(existing?.status ?? null, {
    type: 'checkout_completed',
    tier,
  });

  if (existing) {
    await sql`
      UPDATE subscriptions
      SET status = ${fsm.status},
          current_period_start = ${periodStart.toISOString().slice(0, 10)},
          current_period_end = ${periodEnd.toISOString().slice(0, 10)},
          stripe_customer_id = COALESCE(${customerId ?? null}, stripe_customer_id)
      WHERE id = ${existing.id}
    `;
  } else {
    await sql`
      INSERT INTO subscriptions (
        member_id, tier, stripe_subscription_id, stripe_customer_id,
        yearly_amount_cents, current_period_start, current_period_end, status
      ) VALUES (
        ${memberId}, ${tier}, ${subscriptionId}, ${customerId ?? null},
        ${tierToCents(tier)},
        ${periodStart.toISOString().slice(0, 10)},
        ${periodEnd.toISOString().slice(0, 10)},
        ${fsm.status}
      )
    `;
  }

  for (const effect of fsm.sideEffects) {
    if (effect === 'send_welcome') {
      try {
        await sendMail({
          to: member.email,
          subject: 'Du bist da.',
          html: welcomeTemplate({ name: member.display_name }),
        });
      } catch (err) {
        console.warn(
          '[stripe/webhook] welcome mail failed',
          memberId,
          (err as Error).message,
        );
      }
    } else if (effect === 'insert_scholarship_share') {
      // 5% of yearly_amount goes into the anonymous pool. Inner Circle
      // hits this path; NORDSTERN is a separate product line that doesn't
      // yet have Stripe prices configured (placeholder for future code).
      const share = Math.floor((tierToCents(tier) * 5) / 100);
      const year = new Date().getUTCFullYear();
      try {
        await sql`
          INSERT INTO scholarship_pool_contributions
            (contribution_year, amount_cents, source)
          VALUES (${year}, ${share}, 'inner_circle_share')
        `;
      } catch (err) {
        console.warn(
          '[stripe/webhook] scholarship share insert failed',
          memberId,
          (err as Error).message,
        );
      }
      // TODO(NORDSTERN): once Stripe price IDs for NORDSTERN exist,
      // detect them via tier='nordstern_*' and insert with
      // source='nordstern_share'. They are a separate product line per
      // Spec FR-017.
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) return;
  const sub = await loadSubscriptionByStripeId(subscriptionId);
  if (!sub) return;

  const alreadyNotified = sub.payment_failure_notified_at != null;
  const fsm = nextSubscriptionState(sub.status, {
    type: 'invoice_payment_failed',
    paymentFailureAlreadyNotified: alreadyNotified,
  });

  await sql`
    UPDATE subscriptions SET status = ${fsm.status} WHERE id = ${sub.id}
  `;

  for (const effect of fsm.sideEffects) {
    if (effect === 'send_payment_failed') {
      const member = await loadMember(sub.member_id);
      if (!member) continue;
      const siteUrl = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';
      const updateUrl = `${siteUrl}/communitas-mitglied/konto/`;
      try {
        await sendMail({
          to: member.email,
          subject: 'Eine Abbuchung ist nicht durchgegangen.',
          html: paymentFailedTemplate({
            name: member.display_name,
            update_url: updateUrl,
          }),
        });
      } catch (err) {
        console.warn(
          '[stripe/webhook] payment-failed mail failed',
          sub.member_id,
          (err as Error).message,
        );
      }
    } else if (effect === 'mark_payment_failure_notified') {
      await sql`
        UPDATE subscriptions SET payment_failure_notified_at = now()
        WHERE id = ${sub.id}
      `;
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) return;
  const sub = await loadSubscriptionByStripeId(subscriptionId);
  if (!sub) return;

  const fsm = nextSubscriptionState(sub.status, {
    type: 'invoice_payment_succeeded',
  });
  if (fsm.status !== sub.status) {
    await sql`
      UPDATE subscriptions SET status = ${fsm.status} WHERE id = ${sub.id}
    `;
  }
  for (const effect of fsm.sideEffects) {
    if (effect === 'clear_payment_failure_notified') {
      await sql`
        UPDATE subscriptions SET payment_failure_notified_at = NULL
        WHERE id = ${sub.id}
      `;
    }
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const sub = await loadSubscriptionByStripeId(subscription.id);
  if (!sub) return;
  const fsm = nextSubscriptionState(sub.status, { type: 'subscription_cancelled' });
  if (fsm.status !== sub.status) {
    await sql`
      UPDATE subscriptions SET status = ${fsm.status} WHERE id = ${sub.id}
    `;
  }
  // No mail — Spec FR-019 explicitly forbids re-engagement / "we miss you".
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const sub = await loadSubscriptionByStripeId(subscription.id);
  if (!sub) return;
  // Sync `cancel_at_period_end` flag; leave status logic to the dedicated
  // FSM events (invoice.* and subscription.deleted).
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  await sql`
    UPDATE subscriptions
    SET cancel_at_period_end = ${cancelAtPeriodEnd}
    WHERE id = ${sub.id}
  `;
}
