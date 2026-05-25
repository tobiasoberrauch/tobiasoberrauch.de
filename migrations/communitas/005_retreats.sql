-- 005_retreats.sql — retreats and bookings

CREATE TABLE IF NOT EXISTS retreats (
  id              BIGSERIAL PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('spring','summer','autumn','winter','pilgrimage')),
  title           TEXT NOT NULL,
  location        TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  max_participants SMALLINT NOT NULL CHECK (max_participants BETWEEN 6 AND 12),
  description     TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL,
  cancelled_at    TIMESTAMPTZ,
  cancellation_note TEXT
);

CREATE TABLE IF NOT EXISTS retreat_bookings (
  id            BIGSERIAL PRIMARY KEY,
  retreat_id    BIGINT NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  member_id     BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  price_paid_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  booked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at  TIMESTAMPTZ,
  UNIQUE (retreat_id, member_id)
);
CREATE INDEX IF NOT EXISTS retreat_bookings_retreat_idx ON retreat_bookings(retreat_id) WHERE cancelled_at IS NULL;
