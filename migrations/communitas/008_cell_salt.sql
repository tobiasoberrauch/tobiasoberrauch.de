-- 008_cell_salt.sql — per-member random salt for the Zelle KDF.
--
-- The salt is a public input to Argon2id: it does NOT need to be secret,
-- but it must be (a) stable across sessions and devices for the same member
-- and (b) different from every other member's salt so two members with the
-- same passphrase derive different keys.
--
-- Stored as 16 raw bytes; sent to the browser on demand. The passphrase
-- itself NEVER leaves the browser.

ALTER TABLE members ADD COLUMN IF NOT EXISTS cell_salt BYTEA;
