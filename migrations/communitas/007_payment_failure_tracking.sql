-- 007_payment_failure_tracking.sql
-- Track when the one-time payment-failure email was sent so we never send
-- a second one (Spec Edge Case "Zahlungsstörung": one mail, sachlich, ohne
-- Drohung, kein automatisierter Mahnlauf). Phase 5 / US3.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_failure_notified_at TIMESTAMPTZ;
