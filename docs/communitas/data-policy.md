# Communitas Cotidiana — Datenpolitik und Verfahrensverzeichnis

Dieses Dokument fasst zusammen, welche personenbezogenen Daten die
Communitas-Plattform verarbeitet, auf welcher Rechtsgrundlage, wie lange,
wer sie sehen kann und wo die Verschlüsselungsgrenzen liegen. Es ist als
DSGVO-Verfahrensverzeichnis nach Art. 30 DSGVO gedacht.

Stand: 2026.

---

## Verantwortlicher

Tobias Oberrauch, tobias@tobiasoberrauch.de, Adresse siehe Impressum unter
https://tobiasoberrauch.de/.

Auf gegenwärtiger Größenordnung ist kein Datenschutzbeauftragter
verpflichtend. Sollte die Communitas wachsen und die Schwelle von 20
ständig mit der Verarbeitung beschäftigten Personen überschreiten, wird
ein DSB benannt.

---

## Zweck der Verarbeitung

Bereitstellung einer spirituellen Mitgliedschaft („Communitas Cotidiana"):
tägliche Anker-Mails, monatliche Vollmond-Briefe, jährliche Reisen,
private Schreibräume, Briefkreise, Stipendien. Keine Werbung, keine
Profilbildung im Sinne von Art. 22 DSGVO.

---

## Kategorien personenbezogener Daten

| Kategorie | Inhalt | Beispiel |
|-----------|--------|----------|
| Bewerbung | Name, E-Mail, Frage-Antwort, optional „Brief an sich selbst" (verschlüsselt) | `applications` |
| Mitglied | Name, E-Mail, Zeitzone, Schale, Postanschrift (optional) | `members` |
| Zahlungen | Stripe-Subscription-IDs, Stripe-Customer-IDs, Periode, Status, Tier | `subscriptions` |
| Anker-Versand | Datum, Anker-Typ — KEIN Inhalt, KEIN Lesebestätigung | `anker_sent_log` |
| Reisen-Buchungen | retreat_id, member_id, Zahlung, Datum | `retreat_bookings` |
| Zelleneinträge | clientseitig verschlüsselt — der Server sieht nur Ciphertext | `cell_entries` |
| Kreis-Nachrichten | clientseitig verschlüsselt — der Server sieht nur Ciphertext | `kreis_messages` |
| Vollmond-Briefe | Klartext, Autor (Tobias oder Begleiter) | `full_moon_letters` |
| Stipendien-Bewerbungen | verschlüsselt mit `LETTER_ENCRYPTION_KEY` | `scholarship_applications` |
| Stipendien-Vergaben | Empfänger-Mitgliedsnummer, Jahr | `scholarship_grants` |
| Pool-Beiträge | Jahr, Betrag, Quelle — KEINE Verknüpfung zu Empfängern | `scholarship_pool_contributions` |
| Sessions | Magic-Link-Tokens (gehasht), UA, IP-Land | `sessions`, `magic_links` |

Wir verarbeiten **keine** besonderen Kategorien nach Art. 9 DSGVO
(Gesundheits-, religions-, ethnische Daten) — auch nicht durch
abgeleitete Profilierung.

---

## Rechtsgrundlage

- **Art. 6(1)(b) DSGVO** (Vertragserfüllung): Mitglieds-Verwaltung,
  Zahlungsabwicklung, Versand der bezahlten Inhalte (Cotidianum,
  Vollmond-Briefe, Reisen).
- **Art. 6(1)(a) DSGVO** (Einwilligung): Bewerbungs-Formular, Briefkreis-
  Teilnahme, alle nicht zwingend zur Vertragsausführung benötigten
  Datenflüsse.
- **Art. 6(1)(f) DSGVO** (berechtigte Interessen): IP-Land-Erfassung für
  Geo-Routing (Sub-Sekunden gespeichert), Session-Cookies zur
  Authentifizierung.

---

## Aufbewahrungsdauer

Im Detail in `specs/001-communitas-cotidiana/data-model.md` §Data Retention.
Kurzfassung:

| Daten | Frist |
|-------|-------|
| Bewerbungen (Status `received` oder `in_conversation`) | 90 Tage, dann manuelle Sichtung |
| Bewerbungen (Status `declined`) | 30 Tage, dann automatische Löschung |
| Bewerbungen (Status `accepted`) | Migriert nach `members`, Original gelöscht nach 90 Tagen |
| „Brief an sich selbst" | 90 Tage Aufbewahrung, dann Versand zurück, dann Löschung |
| Mitgliederdaten | Bis Austritt + 30 Tage (für Buchhaltung), dann hard-delete |
| Zelleneinträge | Bis Austritt, dann Export + sofortige unwiderrufliche Löschung |
| Kreis-Nachrichten | Bis Austritt aus dem Kreis, dann sofortige Löschung |
| Anker-Versand-Log | 24 Monate (Idempotenz + Statistik), dann anonymisiert |
| Sessions | 7 Tage, dann automatische Bereinigung |
| Magic-Links | 10 Minuten Gültigkeit, dann nicht mehr verwendbar |
| Stipendien-Bewerbungen | Bis Entscheidung + 30 Tage |
| Zahlungsdaten | Bis Vertragsende + handelsrechtliche Aufbewahrungsfrist (10 Jahre) |

---

## Verschlüsselungsgrenzen

**Was der Server LESEN KANN (mit `LETTER_ENCRYPTION_KEY` in der Env-Var):**

- „Brief an sich selbst" (`applications.letter_to_self`)
- Stipendien-Bewerbungs-Briefe (`scholarship_applications.letter_ciphertext`)

Diese werden mit AES-256-GCM verschlüsselt, IV pro Datensatz neu generiert.
Der Schlüssel liegt ausschließlich in Vercel Environment Variables. Nur
Tobias und die Begleiter haben Zugang zum Vercel-Project.

**Was der Server NICHT LESEN KANN — selbst Tobias kann es nicht:**

- Zelleneinträge (`cell_entries`) — clientseitig mit Mitglied-Passwort
  verschlüsselt (PBKDF2 + AES-GCM). Passwort-Verlust = Datenverlust;
  das ist Architekturentscheidung, keine Schwäche.
- Kreis-Nachrichten (`kreis_messages`) — clientseitig mit Kreis-Symkey
  verschlüsselt, das Symkey selbst ist mit jedem Mitglieds-Passwort
  envelopt.

Diese Grenze ist im Quellcode erzwungen (`src/lib/communitas/client-crypto.ts`,
keine `decrypt`-Funktion auf der Server-Seite) und in den Unit-Tests
(`tests/communitas/unit/server-blindness.test.ts`) als Regression gesichert.

---

## Empfänger personenbezogener Daten

Wir übermitteln Daten ausschließlich an EU-basierte Dienstleister, mit
denen Auftragsverarbeitungsverträge nach Art. 28 DSGVO bestehen:

| Dienstleister | Daten | Standort | Zweck |
|---------------|-------|----------|-------|
| Resend (resend.com) | E-Mail-Adresse, Mail-Body | EU (Irland) | Mailversand mit `tracking.opens=false` und `tracking.clicks=false` |
| Stripe Payments Europe Ltd | Name, E-Mail, Zahlungsdaten | EU (Irland) | Zahlungsabwicklung |
| Vercel Inc. (über `vercel.app`) | HTTP-Logs, Funktionsausführungen | EU (Frankfurt — `fra1`-Region pinned in `vercel.json`) | Hosting |
| Neon (neon.tech) | Datenbankinhalt | EU (Frankfurt) | PostgreSQL |

**Keine** Übertragung an US-Tracker (Meta, LinkedIn, Google Ads). Spec
SC-008 verbietet diese kategorisch. Bestehende Vercel-Analytics-Integration
und optionales OpenPanel sind so konfiguriert, dass alle
`/communitas-mitglied/*`-Routen ausgeschlossen sind.

---

## Rechte der Betroffenen

- **Auskunft** (Art. 15 DSGVO): per E-Mail an tobias@tobiasoberrauch.de.
  Ein Export aller eigenen Daten als JSON + Markdown wird innerhalb von
  14 Tagen geliefert.
- **Berichtigung** (Art. 16 DSGVO): Mitglieder können Namen, E-Mail,
  Postanschrift im `/communitas-mitglied/konto`-Bereich selbst ändern.
- **Löschung** (Art. 17 DSGVO): Bei Austritt werden alle persönlichen
  Daten innerhalb von 30 Tagen hard-gelöscht. Buchhaltungs-relevante
  Zahlungsdaten unterliegen handelsrechtlicher Aufbewahrungsfrist.
- **Einschränkung** (Art. 18 DSGVO): Mitgliedschaft pausieren via
  `paused_until`-Feld — keine Anker-Mails, keine Vollmond-Briefe, bis
  zur Wieder-Aktivierung.
- **Übertragbarkeit** (Art. 20 DSGVO): Export als strukturiertes JSON
  möglich.
- **Widerspruch** (Art. 21 DSGVO): einmaliger Klick auf „Abmelden"-
  Link in jedem Vollmond-Brief beendet die Mitgliedschaft.
- **Widerruf der Einwilligung**: jederzeit per E-Mail.

---

## Sicherheitsmaßnahmen

- HTTPS überall, HSTS aktiv
- Session-Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`, HMAC-signiert
- Magic-Links: 10-Minuten-TTL, Single-Use, gehashter Token (SHA-256)
- LETTER_ENCRYPTION_KEY: 32 Byte zufällig generiert, ausschließlich in
  Vercel Env Vars
- Datenbank: SSL-Pflicht (`sslmode=require`)
- Code-Audit: Spec FR-024 (keine Likes, keine Profile, keine Activity-
  Indikatoren), Anti-Personenkult-Tests (`anti-personenkult.test.ts`),
  No-Tracking-Tests (`no-tracking.test.ts`, `email-no-tracking.test.ts`)

---

## Kontakt

Datenschutzanfragen: tobias@tobiasoberrauch.de

Beschwerden bei der Aufsichtsbehörde:
- Deutschland: Landesbeauftragter für Datenschutz Baden-Württemberg
- Schweiz: EDÖB
- Österreich: Datenschutzbehörde
