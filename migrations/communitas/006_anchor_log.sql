-- 006_anchor_log.sql — daily anchor send log + full-moon letters
-- Also: add members.last_quiet_check_at for 3-month-check throttling.

CREATE TABLE IF NOT EXISTS anker_sent_log (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  anker_type    TEXT NOT NULL CHECK (anker_type IN ('morning','noon','evening','full_moon','silent_assembly','reading_assembly')),
  scheduled_for DATE NOT NULL,
  schedule_slot TEXT NOT NULL,
  content_ref   TEXT NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, anker_type, scheduled_for)
);
CREATE INDEX IF NOT EXISTS anker_sent_member_recent_idx ON anker_sent_log(member_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS full_moon_letters (
  id             BIGSERIAL PRIMARY KEY,
  full_moon_date DATE UNIQUE NOT NULL,
  author_id      BIGINT NOT NULL REFERENCES members(id),
  body_markdown  TEXT NOT NULL,
  paper_letter_pdf BYTEA,
  sent_at        TIMESTAMPTZ
);

-- Throttling column for the weekly three-month-check cron.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS last_quiet_check_at TIMESTAMPTZ;
