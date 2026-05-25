-- 009_account_lifecycle.sql — tracking for the export-before-leave gate.
--
-- Phase 6 / US4 / T091, T092.
--
-- A member can only close their account once they have downloaded their
-- full data archive. The export endpoint stamps `last_export_at`; the
-- leave endpoint refuses unless that timestamp is within the last 30 days.
-- This is a one-way door by design: the spec says „Konto schließen heißt:
-- vollständiger Datenexport plus harte Löschung."

ALTER TABLE members ADD COLUMN IF NOT EXISTS last_export_at TIMESTAMPTZ;
