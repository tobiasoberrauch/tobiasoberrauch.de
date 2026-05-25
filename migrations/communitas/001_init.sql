-- 001_init.sql — Communitas Cotidiana core schema
-- Idempotent: re-runnable safely.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- schales: seven static "shells" (reference data)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schales (
  key             TEXT PRIMARY KEY,
  latin_name      TEXT NOT NULL,
  german_name     TEXT NOT NULL,
  inner_question  TEXT NOT NULL,
  display_order   SMALLINT NOT NULL
);

-- ---------------------------------------------------------------------------
-- applications: incoming applications before membership
-- (members is referenced below; we'll create members first, then add the FK
--  for reviewer_id at the end of this file via ALTER TABLE for clean ordering.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                  BIGSERIAL PRIMARY KEY,
  application_id      BIGINT,
  email               CITEXT UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,
  current_schale_key  TEXT NOT NULL REFERENCES schales(key) DEFAULT 'speculum',
  schale_set_by       BIGINT REFERENCES members(id),
  schale_set_at       TIMESTAMPTZ,
  in_threshold_until  DATE,
  joined_on           DATE NOT NULL DEFAULT (current_date),
  timezone            TEXT NOT NULL DEFAULT 'Europe/Berlin',
  preferred_locale    TEXT NOT NULL DEFAULT 'de'
                      CHECK (preferred_locale IN ('de','en','la','grc')),
  role                TEXT NOT NULL DEFAULT 'member'
                      CHECK (role IN ('member','companion','founder')),
  postal_address      JSONB,
  paused_until        DATE,
  left_on             DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS members_role_idx ON members(role);
CREATE INDEX IF NOT EXISTS members_active_idx ON members(id) WHERE left_on IS NULL;

CREATE TABLE IF NOT EXISTS applications (
  id                BIGSERIAL PRIMARY KEY,
  applicant_name    TEXT NOT NULL,
  applicant_email   CITEXT NOT NULL,
  question_text     TEXT NOT NULL CHECK (length(question_text) <= 2000),
  letter_to_self    BYTEA,
  letter_iv         BYTEA,
  desired_tier      TEXT CHECK (desired_tier IN ('basis','voll','inner_circle')) NOT NULL DEFAULT 'basis',
  status            TEXT NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received','in_conversation','accepted','declined','withdrawn')),
  status_note       TEXT,
  reviewer_id       BIGINT REFERENCES members(id) ON DELETE SET NULL,
  return_letter_at  DATE,
  letter_returned_at TIMESTAMPTZ,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_country        TEXT
);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status, received_at);
CREATE INDEX IF NOT EXISTS applications_return_idx ON applications(return_letter_at) WHERE letter_returned_at IS NULL;

-- Now add the application_id FK on members (deferred to avoid circular dependency).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'members' AND constraint_name = 'members_application_id_fkey'
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT members_application_id_fkey
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- sessions: magic-link-based browser sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  user_agent   TEXT,
  ip_country   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sessions_member_idx ON sessions(member_id);

CREATE TABLE IF NOT EXISTS magic_links (
  token_hash   TEXT PRIMARY KEY,
  member_id    BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Seed: the seven Schalen
-- ---------------------------------------------------------------------------
INSERT INTO schales (key, latin_name, german_name, inner_question, display_order) VALUES
  ('speculum',  'SPECULUM',  'Der Spiegel des Selbst',           'Wer bin ich, wenn niemand zusieht?',                      1),
  ('silentium', 'SILENTIUM', 'Die Begegnung mit der Stille',     'Was höre ich, wenn ich aufhöre zu sprechen?',             2),
  ('rota',      'ROTA',      'Die Wiederholung innerer Muster',  'Welche Bewegung wiederhole ich, ohne es zu wissen?',      3),
  ('velum',     'VELUM',     'Der Schleier der Selbsttäuschung', 'Wo lüge ich mich an, ohne es zu merken?',                 4),
  ('logos',     'LOGOS',     'Die Wahrheit und die innere Haltung','Wofür stehe ich, wenn alles andere gegangen ist?',     5),
  ('vox',       'VOX',       'Die eigene, ungelebte Stimme',     'Was habe ich nie ausgesprochen, was gesprochen werden will?', 6),
  ('vestigium', 'VESTIGIUM', 'Die Spur, die ein Mensch hinterlässt','Was bleibt von mir, wenn ich gegangen bin?',          7)
ON CONFLICT (key) DO NOTHING;
