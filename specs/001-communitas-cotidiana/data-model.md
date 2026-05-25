# Phase 1 — Data Model

**Date**: 2026-05-20
**Storage**: PostgreSQL (Neon, EU Frankfurt)
**Migration Convention**: numbered SQL files in `migrations/communitas/`

Alle Zeitstempel sind `TIMESTAMPTZ` in UTC; lokale Anzeige erfolgt über Mitglieder-Zeitzone (`members.timezone`). Soft-Deletes werden vermieden — austretende Mitglieder werden mit ihrem Datenarchiv exportiert und dann hart gelöscht (Spec FR-025).

## Schalen (Reference Data)

Sieben statische Einträge, eingeführt in `001_init.sql` via INSERT:

| key | latin_name | german_name | inner_question (Auszug) |
|---|---|---|---|
| speculum | SPECULUM | Der Spiegel des Selbst | Wer bin ich, wenn niemand zusieht? |
| silentium | SILENTIUM | Die Begegnung mit der Stille | Was höre ich, wenn ich aufhöre zu sprechen? |
| rota | ROTA | Die Wiederholung innerer Muster | Welche Bewegung wiederhole ich, ohne es zu wissen? |
| velum | VELUM | Der Schleier der Selbsttäuschung | Wo lüge ich mich an, ohne es zu merken? |
| logos | LOGOS | Die Wahrheit und die innere Haltung | Wofür stehe ich, wenn alles andere gegangen ist? |
| vox | VOX | Die eigene, ungelebte Stimme | Was habe ich nie ausgesprochen, was gesprochen werden will? |
| vestigium | VESTIGIUM | Die Spur, die ein Mensch hinterlässt | Was bleibt von mir, wenn ich gegangen bin? |

```sql
CREATE TABLE schales (
  key             TEXT PRIMARY KEY,
  latin_name      TEXT NOT NULL,
  german_name     TEXT NOT NULL,
  inner_question  TEXT NOT NULL,
  display_order   SMALLINT NOT NULL
);
```

## Entities

### applications

Eingehende Bewerbungen. Wird VOR der Mitgliedschaft erfasst.

```sql
CREATE TABLE applications (
  id                BIGSERIAL PRIMARY KEY,
  applicant_name    TEXT NOT NULL,
  applicant_email   CITEXT NOT NULL,
  question_text     TEXT NOT NULL CHECK (length(question_text) <= 2000),
  letter_to_self    BYTEA,           -- AES-GCM-Chiffrat des „Brief an sich selbst", optional
  letter_iv         BYTEA,           -- nonce (12 bytes)
  desired_tier      TEXT CHECK (desired_tier IN ('basis','voll','inner_circle')) NOT NULL DEFAULT 'basis',
  status            TEXT NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received','in_conversation','accepted','declined','withdrawn')),
  status_note       TEXT,            -- interne Notiz Begleiter
  reviewer_id       BIGINT REFERENCES members(id) ON DELETE SET NULL,
  return_letter_at  DATE,            -- Stichtag für ungeöffneten Rückversand (Eintrittsdatum + 1 Jahr)
  letter_returned_at TIMESTAMPTZ,    -- gesetzt nach Rückversand
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_country        TEXT             -- nur Country-Code für DSGVO-Logging, keine vollständige IP
);
CREATE INDEX applications_status_idx ON applications(status, received_at);
CREATE INDEX applications_return_idx ON applications(return_letter_at) WHERE letter_returned_at IS NULL;
```

**Notes**:
- `letter_to_self` ist serverseitig verschlüsselt mit `LETTER_ENCRYPTION_KEY` aus Vercel-Env. Inhalt wird NIE entschlüsselt für Lesezugriff — nur am `return_letter_at`-Stichtag, um den Klartext per E-Mail zurückzusenden.
- `applicant_email` ist `CITEXT` (case-insensitive) zur Duplikat-Erkennung.
- `ip_country` (Edge-Header `x-vercel-ip-country`) wird gespeichert, vollständige IP nicht.

### members

Aufgenommene, zahlende Mitglieder.

```sql
CREATE TABLE members (
  id                  BIGSERIAL PRIMARY KEY,
  application_id      BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  email               CITEXT UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,           -- Vorname genügt im Mitgliederraum
  current_schale_key  TEXT NOT NULL REFERENCES schales(key) DEFAULT 'speculum',
  schale_set_by       BIGINT REFERENCES members(id),  -- Begleiter (nicht Algorithmus)
  schale_set_at       TIMESTAMPTZ,
  in_threshold_until  DATE,             -- Schwellenritus aktiv bis (3–7 Tage)
  joined_on           DATE NOT NULL DEFAULT (current_date),
  timezone            TEXT NOT NULL DEFAULT 'Europe/Berlin',
  preferred_locale    TEXT NOT NULL DEFAULT 'de'
                      CHECK (preferred_locale IN ('de','en','la','grc')),  -- vorbereitet, derzeit nur 'de'
  role                TEXT NOT NULL DEFAULT 'member'
                      CHECK (role IN ('member','companion','founder')),  -- 'founder' nur Tobias, 'companion' = Begleiter
  postal_address      JSONB,            -- für Wenden-Briefe per Post; nur Voll+InnerCircle
  paused_until        DATE,             -- für Ruhen der Mitgliedschaft
  left_on             DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX members_role_idx ON members(role);
CREATE INDEX members_active_idx ON members(id) WHERE left_on IS NULL;
```

### sessions

Magic-Link-basierte Browser-Sessions.

```sql
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  user_agent   TEXT,
  ip_country   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ
);
CREATE INDEX sessions_member_idx ON sessions(member_id);

CREATE TABLE magic_links (
  token_hash   TEXT PRIMARY KEY,    -- SHA-256 des Tokens; Klartext nur in E-Mail
  member_id    BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,  -- 10 min
  used_at      TIMESTAMPTZ
);
```

### subscriptions

Eine aktive oder vergangene Mitgliedschaftsstufe.

```sql
CREATE TABLE subscriptions (
  id                       BIGSERIAL PRIMARY KEY,
  member_id                BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tier                     TEXT NOT NULL CHECK (tier IN ('basis','voll','inner_circle')),
  stripe_subscription_id   TEXT UNIQUE,
  stripe_customer_id       TEXT,
  yearly_amount_cents      INTEGER NOT NULL,    -- 96000 / 360000 / 1800000
  current_period_start     DATE NOT NULL,
  current_period_end       DATE NOT NULL,
  status                   TEXT NOT NULL
                           CHECK (status IN ('active','past_due','cancelled','paused','scholarship')),
  scholarship_grant_id     BIGINT REFERENCES scholarship_grants(id),  -- gesetzt nur bei status='scholarship'
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_member_active_idx ON subscriptions(member_id) WHERE status = 'active';
```

### cell_entries (Zelle — verschlüsselter Schreibraum)

Server-blind: nur Chiffrat, nonce, und Metadaten ohne Inhalts-Bezug.

```sql
CREATE TABLE cell_entries (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ciphertext    BYTEA NOT NULL,       -- AES-GCM Output (inkl. AuthTag)
  iv            BYTEA NOT NULL,       -- 12 Bytes
  written_on    DATE NOT NULL,        -- Datum, das das Mitglied wählt (i.d.R. heute) — KEIN Inhalt
  byte_length   INTEGER NOT NULL,     -- für UI-Listung („3 KB Eintrag"), kein Inhalt
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cell_entries_member_date_idx ON cell_entries(member_id, written_on DESC);
```

**Notes**:
- Es gibt KEIN Titel-Feld, KEIN Tags-Feld, KEIN Inhalts-Index — alles, was den Inhalt erschließen könnte, läge offen.
- Wenn ein Mitglied austritt, wird ein Export-Job die Chiffrate per E-Mail an das Mitglied senden (das Mitglied hat den Schlüssel) und die Zeilen aus der Tabelle löschen.

### kreise (Briefkreise)

```sql
CREATE TABLE kreise (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,            -- intern für Begleiter, z.B. „Kreis I — Herbst 2026"
  introductory_question TEXT NOT NULL,
  created_by      BIGINT NOT NULL REFERENCES members(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE TABLE kreis_members (
  kreis_id    BIGINT NOT NULL REFERENCES kreise(id) ON DELETE CASCADE,
  member_id   BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  PRIMARY KEY (kreis_id, member_id)
);

CREATE TABLE kreis_messages (
  id          BIGSERIAL PRIMARY KEY,
  kreis_id    BIGINT NOT NULL REFERENCES kreise(id) ON DELETE CASCADE,
  author_id   BIGINT NOT NULL REFERENCES members(id),
  ciphertext  BYTEA NOT NULL,           -- mit Kreis-Symkey verschlüsselt; siehe Notes
  iv          BYTEA NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kreis_messages_kreis_idx ON kreis_messages(kreis_id, sent_at DESC);
```

**Notes für Kreis-Verschlüsselung**:
- Pro Kreis existiert ein symmetrischer Schlüssel, der bei Kreis-Erstellung generiert wird. Dieser Schlüssel wird an jedes neue Kreismitglied per Magic-Link-ähnlichem Einmal-Mechanismus übergeben und in ihrem Browser-IndexedDB gespeichert (gleich wie Zell-Schlüssel, getrennter Slot).
- Server speichert nur Chiffrate. Beim Beitritt eines neuen Kreismitglieds müssen bestehende Mitglieder den Schlüssel manuell teilen (z.B. „Lese-Code anzeigen"-UI mit 6 Wörtern).
- Beim Austritt eines Kreismitglieds verbleibt der Schlüssel beim Ausgetretenen — der Kreis kann optional rotieren (neuer Schlüssel, alte Chiffrate werden re-encrypted oder unleserlich akzeptiert).

### anker_sent_log

Idempotenz-Log für Cotidianum-Versand und Erkennung von 3-Monats-Schweige.

```sql
CREATE TABLE anker_sent_log (
  id            BIGSERIAL PRIMARY KEY,
  member_id     BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  anker_type    TEXT NOT NULL CHECK (anker_type IN ('morning','noon','evening','full_moon','silent_assembly','reading_assembly')),
  scheduled_for DATE NOT NULL,                    -- Datum in Mitglied-Zeitzone
  schedule_slot TEXT NOT NULL,                    -- z.B. 'morning-2026-05-21'
  content_ref   TEXT NOT NULL,                    -- Datei-Pfad oder Content-ID
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, anker_type, scheduled_for)
);
CREATE INDEX anker_sent_member_recent_idx ON anker_sent_log(member_id, sent_at DESC);
```

**Erkennung „3 Monate Schweige"**:
- Cron `three-month-check.ts` läuft wöchentlich.
- Selectiert Mitglieder, für die in den letzten 90 Tagen entweder `MAX(sent_at) < 90 days ago` ODER (Anker wurden gesendet, aber Mitglied hat null Reise gebucht / Kreis-Brief geschrieben / Zell-Eintrag erstellt) — beide Bedingungen prüfbar ohne den Inhalt zu kennen, weil wir die Existenz von `cell_entries` und `kreis_messages` zählen, nicht lesen.
- Triggert E-Mail mit dem festen Wortlaut der Wiederfrage (Spec FR + AS Story 2).

### retreats (Reisen)

```sql
CREATE TABLE retreats (
  id              BIGSERIAL PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('spring','summer','autumn','winter','pilgrimage')),
  title           TEXT NOT NULL,
  location        TEXT NOT NULL,                     -- z.B. „Kloster Müstair, CH"
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  max_participants SMALLINT NOT NULL CHECK (max_participants BETWEEN 6 AND 12),
  description     TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL,                  -- Voll-Selbstkosten
  cancelled_at    TIMESTAMPTZ,
  cancellation_note TEXT
);

CREATE TABLE retreat_bookings (
  id            BIGSERIAL PRIMARY KEY,
  retreat_id    BIGINT NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  member_id     BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  price_paid_cents INTEGER NOT NULL,                  -- abhängig von Tier
  stripe_payment_intent_id TEXT,
  booked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at  TIMESTAMPTZ,
  UNIQUE (retreat_id, member_id)
);
CREATE INDEX retreat_bookings_retreat_idx ON retreat_bookings(retreat_id) WHERE cancelled_at IS NULL;
```

### scholarship_pool_contributions / scholarship_grants

Zwei getrennte Tabellen, KEINE Foreign Key zwischen ihnen (siehe research.md §10).

```sql
CREATE TABLE scholarship_pool_contributions (
  id                 BIGSERIAL PRIMARY KEY,
  contribution_year  SMALLINT NOT NULL,
  amount_cents       INTEGER NOT NULL,
  source             TEXT NOT NULL CHECK (source IN ('inner_circle_share','nordstern_share','anonymous_donation')),
  added_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scholarship_pool_year_idx ON scholarship_pool_contributions(contribution_year);

CREATE TABLE scholarship_grants (
  id                  BIGSERIAL PRIMARY KEY,
  grant_year          SMALLINT NOT NULL,
  recipient_member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  granted_on          DATE NOT NULL DEFAULT (current_date),
  approved_by_three   BOOLEAN NOT NULL DEFAULT false,    -- drei Begleiter haben anonym zugestimmt
  notes               TEXT
);
CREATE INDEX scholarship_grants_year_idx ON scholarship_grants(grant_year);
```

**Konsistenz-Invariante**:
- `SUM(amount_cents BY year)` aus `scholarship_pool_contributions` ≥ `COUNT(grants WHERE year) × 360000` (Vollmitgliedschaft-Wert)
- Diese Invariante wird vom Stipendien-Vergabe-Cron geprüft, nicht durch DB-Constraint, weil sie über die Jahre kumuliert werden darf.

### full_moon_letters

Monatliche Vollmond-Briefe für Voll- und Inner-Circle-Mitglieder.

```sql
CREATE TABLE full_moon_letters (
  id             BIGSERIAL PRIMARY KEY,
  full_moon_date DATE UNIQUE NOT NULL,
  author_id      BIGINT NOT NULL REFERENCES members(id),    -- Tobias ODER Begleiter; NICHT NULL
  body_markdown  TEXT NOT NULL,
  paper_letter_pdf BYTEA,                                    -- für Wenden-Quartale (4×/Jahr)
  sent_at        TIMESTAMPTZ
);
```

**Vier-Stimmen-Constraint** (Spec FR-029): Application Layer prüft beim Erstellen eines Briefes, dass die Verteilung der `author_id` über die letzten 12 Briefe Tobias' Anteil unter 50% hält. Falls überschritten, blockiert die UI das Veröffentlichen mit der Meldung „Eine andere Stimme ist dran." DB-Constraint dafür wäre über-engineert.

### content references (auf Disk, nicht in DB)

- Markdown-Pools: `src/lib/communitas/content/anchors/{morning,evening}/*.md`
- Audio-Pools: `public/media/cotidianum/{schale-key}/{weekday}.mp3`
- Manifest: `src/lib/communitas/content/manifesto.md`
- Glossar: `src/lib/communitas/content/glossar.md`

Diese werden NICHT in die DB importiert. Der Scheduler liest sie zur Laufzeit aus dem deployed Vercel-Build.

## State Transitions

### Application → Member

```text
received → in_conversation → accepted → (member row created, payment link sent)
                          ↓
                       declined (no member row)
```

Trigger: Begleiter ändert `status` in der Admin-UI. Bei `accepted` wird automatisch ein `members` row erstellt UND ein Stripe-Checkout-Link per E-Mail versendet. Erst nach erfolgreicher Zahlung wird das Mitglied „aktiv" (Subscription status = 'active') und beginnt Anker-Mails zu empfangen.

### Subscription Lifecycle

```text
[no sub] → active (after first payment)
        → past_due (Stripe webhook on failed renewal) → 1 single sachliche Mail
                                                     → cancelled (after grace period)
        → paused (manual, Mitgliedschaft ruht ohne finanziellen Nachteil)
        → scholarship (status switch, stripe_subscription_id paused)
```

### Schale Transition (Schwellenritus)

```text
member.current_schale_key = X
         → set in_threshold_until = today + 3-7 days
         → reduced anker spur (only morning, no noon/evening)
         → companion sends transition letter
         → after in_threshold_until: clear flag, current_schale_key = Y
```

## Data Retention & DSGVO

- **Mitglieds-Austritt**: Export aller Daten (Zelle-Chiffrate, Kreis-Beiträge, eigene Stipendien-Bewilligungen) als ZIP per E-Mail; Hartlöschung in DB binnen 24h. Foreign-Key-Cascades sorgen für integrale Löschung.
- **Bewerbungs-Ablehnung**: nach 90 Tagen automatische Löschung der `applications`-Zeile inkl. verschlüsseltem Brief; Mitglied wird informiert.
- **Anker-Log**: nach 24 Monaten automatisch gelöscht (Datenminimierung; das Schweige-Erkennungs-Cron hat nie Bedarf an älteren Daten).
- **Session-Tokens**: 7 Tage Lebensdauer, danach Cron-Hartlöschung.

## Index Strategy

Primär: Lookups nach `member_id` + Zeit (täglicher Anker-Versand, Zell-Eintrags-Liste, Kreis-Nachrichten-Lesen). Sekundär: Status-basierte Filter (active subscriptions, received applications). Volltext-Suche ist explizit nicht vorgesehen — Inhalte sind entweder verschlüsselt oder kuratiert und manuell abrufbar.

## Migration Files

```text
migrations/communitas/
├── 001_init.sql            # schales (+ seed data), applications, members, sessions, magic_links
├── 002_briefkreise.sql     # kreise, kreis_members, kreis_messages
├── 003_cell.sql            # cell_entries
├── 004_payments.sql        # subscriptions, scholarship_pool_contributions, scholarship_grants
├── 005_retreats.sql        # retreats, retreat_bookings
└── 006_anchor_log.sql      # anker_sent_log, full_moon_letters
```

Jede Migration ist idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Ein einfacher Runner in `src/lib/communitas/db.ts` führt sie beim Server-Start (lazy) und über CLI-Skript `npm run communitas:migrate` aus.
