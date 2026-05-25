/**
 * Phase 5 / US3 / T082 — Subscription FSM tests.
 *
 * Verifies the pure state-transition logic in `subscription-fsm.ts`:
 *   - All required transitions produce the expected next state.
 *   - No transition produces a re-engagement side-effect.
 *   - Applying the same event twice is idempotent (no duplicate sends).
 */
import { describe, it, expect } from 'vitest';
import {
  nextSubscriptionState,
  type SubscriptionEvent,
  type SubscriptionStatus,
} from '../../../src/lib/communitas/subscription-fsm';

describe('nextSubscriptionState — transitions', () => {
  it('null → checkout_completed(basis) → active + send_welcome', () => {
    const r = nextSubscriptionState(null, {
      type: 'checkout_completed',
      tier: 'basis',
    });
    expect(r.status).toBe('active');
    expect(r.sideEffects).toContain('send_welcome');
    expect(r.sideEffects).not.toContain('insert_scholarship_share');
  });

  it('null → checkout_completed(inner_circle) → active + send_welcome + scholarship share', () => {
    const r = nextSubscriptionState(null, {
      type: 'checkout_completed',
      tier: 'inner_circle',
    });
    expect(r.status).toBe('active');
    expect(r.sideEffects).toContain('send_welcome');
    expect(r.sideEffects).toContain('insert_scholarship_share');
  });

  it('active → invoice_payment_failed(not yet notified) → past_due + send_payment_failed + mark', () => {
    const r = nextSubscriptionState('active', {
      type: 'invoice_payment_failed',
      paymentFailureAlreadyNotified: false,
    });
    expect(r.status).toBe('past_due');
    expect(r.sideEffects).toEqual(
      expect.arrayContaining(['send_payment_failed', 'mark_payment_failure_notified']),
    );
  });

  it('past_due → invoice_payment_succeeded → active + clear flag', () => {
    const r = nextSubscriptionState('past_due', { type: 'invoice_payment_succeeded' });
    expect(r.status).toBe('active');
    expect(r.sideEffects).toContain('clear_payment_failure_notified');
  });

  it('past_due → subscription_cancelled → cancelled + NO mail', () => {
    const r = nextSubscriptionState('past_due', { type: 'subscription_cancelled' });
    expect(r.status).toBe('cancelled');
    expect(r.sideEffects).toEqual([]);
  });

  it('active → subscription_cancelled → cancelled + NO mail', () => {
    const r = nextSubscriptionState('active', { type: 'subscription_cancelled' });
    expect(r.status).toBe('cancelled');
    expect(r.sideEffects).toEqual([]);
  });

  it('active → subscription_paused → paused', () => {
    const r = nextSubscriptionState('active', { type: 'subscription_paused' });
    expect(r.status).toBe('paused');
    expect(r.sideEffects).toEqual([]);
  });

  it('paused → subscription_resumed → active', () => {
    const r = nextSubscriptionState('paused', { type: 'subscription_resumed' });
    expect(r.status).toBe('active');
    expect(r.sideEffects).toEqual([]);
  });

  it('active → scholarship_granted → scholarship', () => {
    const r = nextSubscriptionState('active', { type: 'scholarship_granted' });
    expect(r.status).toBe('scholarship');
    expect(r.sideEffects).toEqual([]);
  });
});

describe('nextSubscriptionState — idempotency', () => {
  it('applying invoice_payment_failed twice produces zero mails the second time', () => {
    const first = nextSubscriptionState('active', {
      type: 'invoice_payment_failed',
      paymentFailureAlreadyNotified: false,
    });
    expect(first.sideEffects).toContain('send_payment_failed');

    // Simulate that the handler set the `payment_failure_notified_at`
    // flag after the first event. Second event then reports already-notified.
    const second = nextSubscriptionState(first.status, {
      type: 'invoice_payment_failed',
      paymentFailureAlreadyNotified: true,
    });
    expect(second.status).toBe('past_due');
    expect(second.sideEffects).not.toContain('send_payment_failed');
    expect(second.sideEffects).not.toContain('mark_payment_failure_notified');
  });

  it('applying checkout_completed twice produces zero welcome the second time', () => {
    const first = nextSubscriptionState(null, {
      type: 'checkout_completed',
      tier: 'voll',
    });
    expect(first.sideEffects).toContain('send_welcome');

    const second = nextSubscriptionState(first.status, {
      type: 'checkout_completed',
      tier: 'voll',
    });
    expect(second.status).toBe('active');
    expect(second.sideEffects).not.toContain('send_welcome');
    expect(second.sideEffects).not.toContain('insert_scholarship_share');
  });

  it('applying subscription_cancelled twice → cancelled both times, no side-effects', () => {
    const first = nextSubscriptionState('active', { type: 'subscription_cancelled' });
    const second = nextSubscriptionState(first.status, { type: 'subscription_cancelled' });
    expect(first.status).toBe('cancelled');
    expect(second.status).toBe('cancelled');
    expect(first.sideEffects).toEqual([]);
    expect(second.sideEffects).toEqual([]);
  });
});

describe('nextSubscriptionState — no re-engagement, ever', () => {
  /**
   * The cardinal anti-feature: this system never sends a "we miss you" /
   * "come back" / "your access is at risk" message. Spec FR-019 + the
   * cancellation flow (FR-019). Test by exhaustively running every event
   * from every starting state, and asserting no side-effect string ever
   * contains words associated with re-engagement.
   */
  const states: (SubscriptionStatus | null)[] = [
    null,
    'active',
    'past_due',
    'cancelled',
    'paused',
    'scholarship',
  ];

  const events: SubscriptionEvent[] = [
    { type: 'checkout_completed', tier: 'basis' },
    { type: 'checkout_completed', tier: 'voll' },
    { type: 'checkout_completed', tier: 'inner_circle' },
    { type: 'invoice_payment_failed', paymentFailureAlreadyNotified: false },
    { type: 'invoice_payment_failed', paymentFailureAlreadyNotified: true },
    { type: 'invoice_payment_succeeded' },
    { type: 'subscription_cancelled' },
    { type: 'subscription_paused' },
    { type: 'subscription_resumed' },
    { type: 'scholarship_granted' },
  ];

  it('no transition includes any re-engagement side-effect', () => {
    const forbidden = [
      'send_re_engagement',
      'send_win_back',
      'send_we_miss_you',
      'send_retention',
      'send_cancellation_confirmation',
    ];
    for (const s of states) {
      for (const e of events) {
        const r = nextSubscriptionState(s, e);
        for (const f of forbidden) {
          expect(r.sideEffects).not.toContain(f);
        }
      }
    }
  });

  it('cancellation never produces ANY mail side-effect', () => {
    for (const s of states) {
      const r = nextSubscriptionState(s, { type: 'subscription_cancelled' });
      // Reject anything starting with 'send_' (the only mail-emitting prefix).
      for (const eff of r.sideEffects) {
        expect(eff.startsWith('send_')).toBe(false);
      }
    }
  });
});
