-- 011_retreat_surcharge.sql — per-retreat Voll-Aufpreis override.
-- The default surcharge is €1800 (180000 cents) in application logic.
-- A NULL here means "use the default"; a non-NULL value overrides it for
-- expensive retreats (Pilgerreise etc.).

ALTER TABLE retreats ADD COLUMN IF NOT EXISTS voll_surcharge_cents INTEGER;
