# Quickstart: Communitas Cotidiana — Entwickler-Onboarding

Diese Anleitung ist für jemanden, der die Communitas-Erweiterung lokal entwickeln, testen, und zum ersten Mal deployen will. Sie geht davon aus, dass die bestehende `tobiasoberrauch.de`-Site läuft (Astro 6, Vercel) und du Zugriff auf die Repos hast.

## Vorbereitung (einmalig)

### 1. Datenbank einrichten (Neon)

1. Auf https://neon.tech registrieren (Free Tier).
2. Projekt erstellen: Name `tobiasoberrauch-communitas`, Region `eu-central-1` (Frankfurt). **Wichtig**: NICHT US-Regions wählen (DSGVO).
3. Connection-String kopieren (`postgresql://...neon.tech/neondb?sslmode=require`).

### 2. Stripe-Account vorbereiten

1. https://dashboard.stripe.com — Account anlegen, Geschäftssitz Deutschland.
2. Im Test-Modus: drei Produkte anlegen
   - „Communitas Basis" — Recurring jährlich €960,00
   - „Communitas Voll" — Recurring jährlich €3.600,00
   - „Communitas Inner Circle" — Recurring jährlich €18.000,00
3. Price-IDs kopieren (Format `price_1OabcXYZ...`).
4. Webhook-Endpoint anlegen: `https://tobiasoberrauch.de/api/communitas/stripe/webhook`, Events `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`. Signing-Secret kopieren.
5. SEPA-Direct-Debit aktivieren (Settings → Payment Methods → SEPA Direct Debit). DPA unterschreiben.

### 3. Resend für Cotidianum

Bestehender Resend-Account (von Newsletter-Integration) wird wiederverwendet. Zusätzlich:

1. Eigene Domain verifizieren (`tobiasoberrauch.de`) — DNS-Records (SPF, DKIM, DMARC) setzen.
2. Zweite Audience „Communitas — Mitglieder" anlegen (UUID notieren).
3. Audience-ID separat zur Newsletter-Audience verwalten.

### 4. Lokale Umgebung

```bash
cd ~/Repositories/tobiasoberrauch/tobiasoberrauch.de
git checkout 001-communitas-cotidiana
npm install
```

Zusätzliche Dependencies (in dieser Plan-Phase noch nicht installiert):

```bash
npm install postgres@^3.4 stripe@^15 @noble/ciphers@^1
npm install -D vitest@^1 playwright@^1
```

### 5. Environment-Variablen

Lokal in `.env.local`, produktiv in Vercel Dashboard:

```env
# Datenbank
COMMUNITAS_DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require

# Auth + Encryption
COMMUNITAS_SESSION_SECRET=        # 32 zufällige Bytes, base64
LETTER_ENCRYPTION_KEY=            # 32 zufällige Bytes, base64 (für Briefe an sich selbst)
CRON_SECRET=                      # 32 zufällige Bytes, hex

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIS=price_...
STRIPE_PRICE_VOLL=price_...
STRIPE_PRICE_INNER_CIRCLE=price_...

# Resend (zusätzlich zu bestehender Newsletter-Config)
RESEND_API_KEY=re_...              # bereits gesetzt
RESEND_COMMUNITAS_AUDIENCE_ID=     # NEU: separat zur Newsletter-Audience
RESEND_FROM_EMAIL=communitas@tobiasoberrauch.de
RESEND_REPLY_TO_EMAIL=tobias@tobiasoberrauch.de

# Operative E-Mail-Adressen
COMMUNITAS_ADMIN_NOTIFY_EMAIL=tobias@tobiasoberrauch.de   # für eingehende Bewerbungen
```

Secrets erzeugen:

```bash
openssl rand -base64 32   # für COMMUNITAS_SESSION_SECRET, LETTER_ENCRYPTION_KEY
openssl rand -hex 32      # für CRON_SECRET
```

### 6. Migrationen ausführen

```bash
npm run communitas:migrate
```

Implementierung in `src/lib/communitas/db.ts`: liest alle Dateien aus `migrations/communitas/`, führt sie idempotent aus (`CREATE TABLE IF NOT EXISTS`).

### 7. Dev-Server

```bash
npm run dev
# Öffne http://localhost:4321/communitas/
```

## Erste Schritte

### Eine Bewerbung simulieren

```bash
curl -X POST http://localhost:4321/api/communitas/apply \
  -H "content-type: application/json" \
  -d '{
    "name": "Test Erika",
    "email": "test@example.com",
    "question": "Was bringt mich hierher?",
    "consent": true
  }'
```

Erwartet: `202 Accepted`. In Postgres prüfen: `SELECT * FROM applications;` zeigt die Zeile.

### Bewerbung annehmen (Admin)

Bisher: direkt in DB. Nach Implementierung Admin-UI: über `/communitas-mitglied/admin/applications`.

```sql
UPDATE applications SET status = 'accepted' WHERE id = 1;
-- Member-Row manuell erzeugen (vor Admin-Endpoint):
INSERT INTO members (application_id, email, display_name, current_schale_key)
VALUES (1, 'test@example.com', 'Erika', 'speculum');
```

### Cron-Endpoint lokal testen

```bash
# Mit dem CRON_SECRET aus .env.local
curl http://localhost:4321/api/communitas/cron/morning \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Erwartet: `{ "sent": N, "skipped": M }`.

## Test-Suite

```bash
# Unit-Tests
npm run test:unit

# E2E (Playwright, braucht Dev-Server laufend)
npm run test:e2e
```

Wichtige Tests:

- `tests/communitas/unit/schedule.test.ts` — prüft Wochenfärbung (Mo=Spiegel, Di=Stille, …) und Schalen-Selektion
- `tests/communitas/unit/client-crypto.test.ts` — round-trip von Klartext → AES-GCM → Klartext
- `tests/communitas/unit/anonymizer.test.ts` — prüft, dass Geber/Empfänger-Anonymität gewahrt bleibt
- `tests/communitas/e2e/application-flow.spec.ts` — Bewerbung-Submit → Bestätigungs-Mail (Mock)
- `tests/communitas/e2e/cell-roundtrip.spec.ts` — Mitglied schreibt Eintrag, Server sieht nur Chiffrat, Mitglied liest zurück

## Deployment

### Auf Vercel deployen

```bash
git push origin 001-communitas-cotidiana
# Vercel erstellt Preview-Deployment automatisch.
```

Production-Promotion erst nach:

1. Stripe Live-Mode konfiguriert (Test-Mode-Keys durch Live-Keys ersetzen).
2. Cron-Jobs in Vercel-Dashboard aktiviert (Pro-Tier nötig).
3. Resend-Domain produktiv verifiziert.
4. Erste Mitglieds-Daten manuell durch Test-Aufnahme erzeugen und das Cotidianum 7 Tage beobachten (Staging).

```bash
vercel --prod --yes
```

### Erste Migration auf Production

Vercel führt Migrationen NICHT automatisch. Nach Deploy einmalig:

```bash
COMMUNITAS_DATABASE_URL=<production_neon_url> npm run communitas:migrate
```

## Beobachtbarkeit

- Vercel-Functions-Tab: Cron-Ausführungen, Fehlerquoten
- Neon-Dashboard: DB-Verbindungen, Storage-Verbrauch
- Resend-Dashboard: Versendete Mails, Bounces
- **Bewusst nicht aktiviert**: Sentry, Datadog, LogRocket — alles, was personenbezogene Daten in Drittsysteme exportiert

Eigene minimale Logs gehen nach `console.log` und sind in Vercel-Logs sichtbar. Bei Bedarf: aggregiertes Tally in Vercel Postgres (separat zur Membership-DB).

## Häufige Probleme

**„Migration läuft nicht durch — `citext` fehlt"**: Neon hat `citext` als Extension; vor Migration einmalig:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

**„Cron triggert nicht in Preview"**: Vercel-Cron läuft nur in Production-Deployment, nicht Preview. Für lokale Tests: `curl` mit `CRON_SECRET` direkt.

**„Stripe-Webhook 401"**: `STRIPE_WEBHOOK_SECRET` stimmt nicht — Stripe-Dashboard → Webhook → Signing-Secret prüfen. Im Test-Mode separater Secret als Live-Mode.

**„Mail kommt nicht an"**: Resend-Dashboard prüfen: ist die Domain verifiziert? Sind DNS-Records (SPF/DKIM/DMARC) korrekt? Bei DKIM-Misslingen werden Mails zwar gesendet aber landen im Spam.

## Skript-Übersicht

```bash
npm run dev                        # Astro Dev-Server
npm run build                      # Astro Production-Build (inkl. API-Routes)
npm run preview                    # Build-Preview lokal
npm run communitas:migrate         # Migrationen ausführen
npm run communitas:migrate:rollback # Letzte Migration zurückrollen (falls implementiert)
npm run test:unit                  # Vitest
npm run test:e2e                   # Playwright (Dev-Server muss laufen)
```

## Wichtige Konventionen

- **Keine Tracker auf Member-Routen**: `<Analytics />` und OpenPanel-Script werden in `Base.astro` per `Astro.url.pathname.startsWith('/communitas-mitglied')` ausgeschlossen.
- **Keine Console-Logs mit PII**: Logge `member_id` (BIGINT), nie `email` oder `display_name`.
- **Keine TODOs im Production-Code**: Wenn etwas offen ist, dokumentiere es in `specs/001-communitas-cotidiana/tasks.md` (entsteht in `/speckit.tasks`).
- **Migrations sind idempotent**: `CREATE ... IF NOT EXISTS`. Keine destruktiven Operationen ohne explizite Migration mit Rollback-Anweisung.
