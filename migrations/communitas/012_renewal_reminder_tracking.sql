-- 012_renewal_reminder_tracking.sql — track when the Vollmond renewal-reminder
-- went out so the weekly cron doesn't re-send within 60 days.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ;
