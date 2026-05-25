-- 003_cell.sql — the Cell (server-blind encrypted writing room)

CREATE TABLE IF NOT EXISTS cell_entries (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ciphertext    BYTEA NOT NULL,
  iv            BYTEA NOT NULL,
  written_on    DATE NOT NULL,
  byte_length   INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cell_entries_member_date_idx ON cell_entries(member_id, written_on DESC);
