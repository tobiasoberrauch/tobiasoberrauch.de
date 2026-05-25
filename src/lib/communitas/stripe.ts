/**
 * Stripe client wrapper for Communitas Cotidiana (Phase 5 / US3).
 *
 * Design constraints (Spec FR-017–FR-020, plan.md):
 *  - SEPA + Card only. NO Buy-Now-Pay-Later, NO Crypto, NO Apple/Google Pay
 *    (their JS loads telemetry).
 *  - Stripe Checkout (hosted page) — no Stripe.js / Elements on our own site.
 *  - Locale `de`. No UTM parameters anywhere.
 *  - Lazy client instantiation so the module is importable without
 *    STRIPE_SECRET_KEY (unit tests, build-time prerender, dev without
 *    Stripe). Callers in API endpoints catch missing-config and return
 *    503 `{ ok: false, code: 'not_configured' }`.
 */
import Stripe from 'stripe';

// The installed stripe@^15.12 typings pin LatestApiVersion to '2024-04-10'.
// Use that exact string so TS accepts it without `as` casts.
const STRIPE_API_VERSION = '2024-04-10' as const;

export type Tier = 'basis' | 'voll' | 'inner_circle';

let stripeClient: Stripe | null = null;

/**
 * Lazily instantiate the Stripe SDK. Throws a clear error if
 * STRIPE_SECRET_KEY is missing — callers MUST catch this and surface it as
 * a 503 `not_configured` JSON response.
 */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error('STRIPE_SECRET_KEY missing');
  stripeClient = new Stripe(k, { apiVersion: STRIPE_API_VERSION });
  return stripeClient;
}

/**
 * Map a tier to its configured Stripe price ID. Operations checklist
 * (T083) covers the manual setup; this function fails loud if the env var
 * is absent so a misconfigured deploy can't silently charge the wrong
 * amount.
 */
export function tierToPriceId(tier: Tier): string {
  switch (tier) {
    case 'basis': {
      const v = process.env.STRIPE_PRICE_BASIS;
      if (!v) throw new Error('Price not configured for tier basis');
      return v;
    }
    case 'voll': {
      const v = process.env.STRIPE_PRICE_VOLL;
      if (!v) throw new Error('Price not configured for tier voll');
      return v;
    }
    case 'inner_circle': {
      const v = process.env.STRIPE_PRICE_INNER_CIRCLE;
      if (!v) throw new Error('Price not configured for tier inner_circle');
      return v;
    }
  }
}

/**
 * Yearly amount in cents per Spec FR-017.
 *
 * - Basis: €960  → 96000
 * - Voll:  €3600 → 360000
 * - Inner Circle: €18000 → 1800000
 *
 * NORDSTERN tiers (€22.500 / €75.000 / €180.000+) are separate products and
 * not handled in Phase 5 — see operational-checklist.md.
 */
export function tierToCents(tier: Tier): number {
  switch (tier) {
    case 'basis':
      return 96000;
    case 'voll':
      return 360000;
    case 'inner_circle':
      return 1800000;
  }
}

export interface CheckoutSessionInput {
  memberId: number;
  memberEmail: string;
  tier: Tier;
}

/**
 * Build a one-redirect Stripe Checkout Session for an annual Communitas
 * subscription. The URLs never carry UTM parameters; the only state we
 * pass through is the `client_reference_id` (member.id as string) so the
 * webhook can correlate the resulting subscription back to a member row.
 */
export async function createCheckoutSession(
  input: CheckoutSessionInput,
): Promise<{ url: string }> {
  const stripe = getStripe();
  const siteUrl = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['sepa_debit', 'card'],
    locale: 'de',
    customer_email: input.memberEmail,
    line_items: [
      { price: tierToPriceId(input.tier), quantity: 1 },
    ],
    success_url: `${siteUrl}/communitas-mitglied/?welcome=true`,
    cancel_url: `${siteUrl}/communitas-mitglied/?checkout=cancelled`,
    client_reference_id: String(input.memberId),
    metadata: {
      member_id: String(input.memberId),
      tier: input.tier,
    },
    // We do NOT enable promotion codes — Spec forbids discount/upsell flows.
    allow_promotion_codes: false,
  });
  return { url: session.url ?? '' };
}

/**
 * Verify a Stripe webhook signature over the *raw* HTTP body. Throws on
 * mismatch — the caller must return 400 in that case.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET missing');
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
