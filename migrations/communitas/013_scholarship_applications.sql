-- 013_scholarship_applications.sql — anonymous scholarship application path.
--
-- The letter body is encrypted with LETTER_ENCRYPTION_KEY (the same envelope
-- key used by „Brief an sich selbst"). Both Tobias and the three Begleiter
-- with the key can read the letter inside the admin-vote UI; the database
-- holds only ciphertext.
--
-- Three companion „ja" votes auto-grant via the existing
-- /api/communitas/admin/scholarships/grant endpoint. Anonymity is preserved
-- because the resulting `scholarship_grants` row has no FK back to
-- `scholarship_pool_contributions` (see research.md §10).

CREATE TABLE IF NOT EXISTS scholarship_applications (
  id                  BIGSERIAL PRIMARY KEY,
  application_year    SMALLINT NOT NULL,
  letter_ciphertext   BYTEA NOT NULL,
  letter_iv           BYTEA NOT NULL,
  applicant_member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at          TIMESTAMPTZ,
  decision            TEXT CHECK (decision IN ('granted','declined'))
);
CREATE INDEX IF NOT EXISTS scholarship_applications_year_idx
  ON scholarship_applications(application_year);

CREATE TABLE IF NOT EXISTS scholarship_votes (
  id              BIGSERIAL PRIMARY KEY,
  application_id  BIGINT NOT NULL REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  voter_member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  vote            TEXT NOT NULL CHECK (vote IN ('ja','nein','enthalten')),
  voted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, voter_member_id)
);
CREATE INDEX IF NOT EXISTS scholarship_votes_application_idx
  ON scholarship_votes(application_id);
