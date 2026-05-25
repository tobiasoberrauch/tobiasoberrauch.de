-- 010_kreis_symkey_salt.sql — store the per-kreis Argon2id salt.
--
-- The 6-word BIP39-style passphrase is generated once in the create-kreis
-- endpoint and emailed individually to each member. The server NEVER stores
-- the words themselves nor the derived key. The salt below is non-secret;
-- members fetch it when they enter the code in their browser, so that the
-- Argon2id derivation produces the same AES-256 key for everyone.
--
-- introductory_question already exists per migration 002 (NOT NULL); we keep
-- the ALTER below as defensive idempotent guard for environments that may
-- have a different baseline.

ALTER TABLE kreise
  ADD COLUMN IF NOT EXISTS symkey_salt BYTEA;
