-- 004_payments.sql — subscriptions and the scholarship pool (anonymity-preserving).
-- IMPORTANT: there is intentionally NO foreign key between
-- scholarship_pool_contributions and scholarship_grants — see research.md §10.

-- Grants must exist before subscriptions, since subscriptions references grants.
CREATE TABLE IF NOT EXISTS scholarship_grants (
  id                  BIGSERIAL PRIMARY KEY,
  grant_year          SMALLINT NOT NULL,
  recipient_member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  granted_on          DATE NOT NULL DEFAULT (current_date),
  approved_by_three   BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT
);
CREATE INDEX IF NOT EXISTS scholarship_grants_year_idx ON scholarship_grants(grant_year);

CREATE TABLE IF NOT EXISTS scholarship_pool_contributions (
  id                 BIGSERIAL PRIMARY KEY,
  contribution_year  SMALLINT NOT NULL,
  amount_cents       INTEGER NOT NULL,
  source             TEXT NOT NULL CHECK (source IN ('inner_circle_share','nordstern_share','anonymous_donation')),
  added_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scholarship_pool_year_idx ON scholarship_pool_contributions(contribution_year);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       BIGSERIAL PRIMARY KEY,
  member_id                BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tier                     TEXT NOT NULL CHECK (tier IN ('basis','voll','inner_circle')),
  stripe_subscription_id   TEXT UNIQUE,
  stripe_customer_id       TEXT,
  yearly_amount_cents      INTEGER NOT NULL,
  current_period_start     DATE NOT NULL,
  current_period_end       DATE NOT NULL,
  status                   TEXT NOT NULL
                           CHECK (status IN ('active','past_due','cancelled','paused','scholarship')),
  scholarship_grant_id     BIGINT REFERENCES scholarship_grants(id),
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_member_active_idx ON subscriptions(member_id) WHERE status = 'active';
