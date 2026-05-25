/**
 * Pure state-machine for the Stripe-driven subscription lifecycle.
 *
 * Extracted from the webhook handler so it can be unit-tested without a
 * DB or Stripe SDK. The handler maps Stripe events → FSM events → side
 * effects, then runs the side effects against the DB and mailer.
 *
 * Allowed states (data-model.md §subscriptions.status):
 *   active | past_due | cancelled | paused | scholarship
 *
 * Allowed side-effects (strings; the handler knows how to execute each):
 *   - 'send_welcome'         — template 13 on first activation
 *   - 'send_payment_failed'  — template payment-failed.ts (ONCE per past_due)
 *   - 'insert_scholarship_share' — for inner_circle / nordstern only
 *   - 'mark_payment_failure_notified' — set subscriptions.payment_failure_notified_at
 *   - 'clear_payment_failure_notified' — when transitioning out of past_due
 *
 * Deliberately NOT in the list (would violate Spec):
 *   - 'send_re_engagement'   — we never send win-back / "we miss you" / etc.
 *   - 'send_cancellation_confirmation' — on customer.subscription.deleted
 *     we go silent. The quiet HTML page on the GET /cancel route is the
 *     only acknowledgement (Spec FR-019).
 *
 * Idempotency: the same event applied twice MUST produce no side-effects
 * the second time. The handler enforces this by passing already-set flags
 * (e.g. `paymentFailureAlreadyNotified`) into the input.
 */

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'scholarship';

export type SubscriptionEvent =
  | { type: 'checkout_completed'; tier: 'basis' | 'voll' | 'inner_circle' }
  | { type: 'invoice_payment_failed'; paymentFailureAlreadyNotified: boolean }
  | { type: 'invoice_payment_succeeded' }
  | { type: 'subscription_cancelled' }
  | { type: 'subscription_paused' }
  | { type: 'subscription_resumed' }
  | { type: 'scholarship_granted' };

export type SideEffect =
  | 'send_welcome'
  | 'send_payment_failed'
  | 'insert_scholarship_share'
  | 'mark_payment_failure_notified'
  | 'clear_payment_failure_notified';

export interface FSMResult {
  status: SubscriptionStatus;
  sideEffects: SideEffect[];
}

/**
 * Compute the next subscription status and the side-effects to run.
 *
 * `current` is the current row's status (or null if the row doesn't exist
 * yet — only checkout_completed handles that case).
 */
export function nextSubscriptionState(
  current: SubscriptionStatus | null,
  event: SubscriptionEvent,
): FSMResult {
  switch (event.type) {
    case 'checkout_completed': {
      // Idempotency: if already active, no welcome resend.
      if (current === 'active') {
        return { status: 'active', sideEffects: [] };
      }
      const effects: SideEffect[] = ['send_welcome'];
      if (event.tier === 'inner_circle') {
        effects.push('insert_scholarship_share');
      }
      return { status: 'active', sideEffects: effects };
    }

    case 'invoice_payment_failed': {
      // Cancelled or paused subscriptions ignore further payment failures.
      if (current === 'cancelled' || current === 'scholarship') {
        return { status: current, sideEffects: [] };
      }
      if (event.paymentFailureAlreadyNotified) {
        // Idempotent: status moves to past_due, but no second mail.
        return { status: 'past_due', sideEffects: [] };
      }
      return {
        status: 'past_due',
        sideEffects: ['send_payment_failed', 'mark_payment_failure_notified'],
      };
    }

    case 'invoice_payment_succeeded': {
      // Recovery from past_due → active. Clears the notification flag so
      // a future failure can again send exactly one mail.
      if (current === 'past_due') {
        return {
          status: 'active',
          sideEffects: ['clear_payment_failure_notified'],
        };
      }
      // Already active — no-op.
      return { status: current ?? 'active', sideEffects: [] };
    }

    case 'subscription_cancelled': {
      if (current === 'cancelled') {
        return { status: 'cancelled', sideEffects: [] };
      }
      // Spec FR-019: NO re-engagement. The list above intentionally omits
      // any 'send_*' effect on cancellation.
      return { status: 'cancelled', sideEffects: [] };
    }

    case 'subscription_paused': {
      if (current === 'paused' || current === 'cancelled') {
        return { status: current, sideEffects: [] };
      }
      return { status: 'paused', sideEffects: [] };
    }

    case 'subscription_resumed': {
      if (current === 'active' || current === 'cancelled') {
        return { status: current, sideEffects: [] };
      }
      return { status: 'active', sideEffects: [] };
    }

    case 'scholarship_granted': {
      if (current === 'scholarship') {
        return { status: 'scholarship', sideEffects: [] };
      }
      return { status: 'scholarship', sideEffects: [] };
    }
  }
}

/**
 * Convenience: enumerate the supported transitions for tests.
 * (Implementation lives in the switch above — this is documentation +
 * a stable handle for the test file.)
 */
export const ALLOWED_TRANSITIONS: ReadonlyArray<{
  from: SubscriptionStatus | null;
  event: SubscriptionEvent['type'];
  to: SubscriptionStatus;
}> = [
  { from: null, event: 'checkout_completed', to: 'active' },
  { from: 'active', event: 'invoice_payment_failed', to: 'past_due' },
  { from: 'past_due', event: 'invoice_payment_succeeded', to: 'active' },
  { from: 'past_due', event: 'subscription_cancelled', to: 'cancelled' },
  { from: 'active', event: 'subscription_cancelled', to: 'cancelled' },
  { from: 'active', event: 'subscription_paused', to: 'paused' },
  { from: 'paused', event: 'subscription_resumed', to: 'active' },
  { from: 'active', event: 'scholarship_granted', to: 'scholarship' },
];
