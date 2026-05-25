-- 002_briefkreise.sql — kreise (letter circles), members, encrypted messages

CREATE TABLE IF NOT EXISTS kreise (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  introductory_question TEXT NOT NULL,
  created_by      BIGINT NOT NULL REFERENCES members(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS kreis_members (
  kreis_id    BIGINT NOT NULL REFERENCES kreise(id) ON DELETE CASCADE,
  member_id   BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  PRIMARY KEY (kreis_id, member_id)
);

CREATE TABLE IF NOT EXISTS kreis_messages (
  id          BIGSERIAL PRIMARY KEY,
  kreis_id    BIGINT NOT NULL REFERENCES kreise(id) ON DELETE CASCADE,
  author_id   BIGINT NOT NULL REFERENCES members(id),
  ciphertext  BYTEA NOT NULL,
  iv          BYTEA NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kreis_messages_kreis_idx ON kreis_messages(kreis_id, sent_at DESC);
