# Phase 0 — Technology Research

**Date**: 2026-05-20
**Status**: Complete (no NEEDS CLARIFICATION outstanding)

Diese Recherche fixiert die Technologie-Entscheidungen für die Communitas-Cotidiana-Implementierung. Jede Entscheidung wird gegen die ethischen Constraints der Spec geprüft (DSGVO, keine Tracker, server-blind für Zelle, Anti-Personenkult).

---

## 1. Mitgliedschafts-Plattform: integriert vs. fremd-gehostet

**Decision**: Vollständig integriert — eigene Postgres-Tabellen + Astro-Endpoints. Keine externe Membership-Plattform.

**Rationale**:
- Memberful, Outseta, Circle.so etc. bringen Default-Tracker (Segment, Intercom, Mixpanel), die mit dem „keine Tracker"-Constraint kollidieren. Sie sind außerdem alle US-Anbieter mit unklarem DSGVO-Status (Schrems-II-Problematik).
- Ein eigenes Mitglied-Schema in Postgres ist klein (~10 Tabellen, siehe `data-model.md`) und folgt der ethischen Architektur ohne Workarounds.
- Die bestehende Site läuft bereits auf Vercel + Astro. Eine zusätzliche Subdomain (z.B. `community.tobiasoberrauch.de` mit Memberful) würde die „eine ruhige Tür"-Logik untergraben.

**Alternatives considered**:
- *Memberful*: Tight Stripe-Integration, aber injected Segment+Mixpanel by default, kein EU-Hosting-Switch.
- *Outseta*: All-in-one, aber Branding-Footer und kein Server-blind-Encryption für die Zelle.
- *Circle.so*: Community-zentriert, aber Social-Features (Likes, Profile, Followers) sind nicht abschaltbar — Architekturwiderspruch.
- *Selbst-gehostete Open-Source (Discourse, BetterMode)*: Overkill für 200 Mitglieder, eigener Maintenance-Burden, keine bessere DSGVO-Position als eigenes Schema.

---

## 2. Datenbank: Hosting + Treiber

**Decision**: PostgreSQL bei Neon Free Tier, Region `eu-central-1` (Frankfurt). Treiber: `postgres` (porsager/postgres) — Serverless-freundlich, native TypeScript-Typen.

**Rationale**:
- Neon Free Tier: 3 GB Storage, 191 Compute-Stunden/Monat — reicht für Jahr 1 (max ~200 Mitglieder, geschätzt < 100 MB Daten).
- EU-Region erfüllt DSGVO ohne SCC-Klimmzüge.
- `postgres` (porsager) bietet bessere Cold-Start-Performance als Prisma in Vercel-Functions (~50ms vs. ~400ms).
- Migrationen via `migrate` package + plain SQL-Files; kein ORM-Lock-in.

**Alternatives considered**:
- *Vercel Postgres (Neon-powered)*: gleicher Backend, aber teurer ab Hobby-Tier ($20/Monat).
- *Supabase Postgres*: bringt eingebautes Auth + Realtime, aber wir brauchen weder; zusätzliche Komplexität.
- *PlanetScale*: MySQL, kein native Vector/JSON-Komfort.
- *SQLite via libSQL (Turso)*: schick, aber wir wollen pgvector-optional offen halten für spätere KI-unterstützte Schalen-Variation.
- *Prisma ORM*: zusätzliche Generation-Schritte, schlechte Vercel-Cold-Starts, lock-in.

---

## 3. Authentifizierung: Magic-Link statt Passwort

**Decision**: Magic-Link via E-Mail (Resend) + signierte httpOnly Session-Cookies (`SECRET` via Vercel Env). Keine Passwörter, keine OAuth.

**Rationale**:
- Spec-Ton: ruhig, schlicht. Passwörter erzeugen Reibung und Reset-Loops.
- Mitglieder geben ihre E-Mail im Aufnahmegespräch sowieso bekannt — Magic-Link nutzt den vorhandenen Kanal.
- Keine OAuth-Anbieter (Google/Apple), weil das wieder Tracker einführt.
- Zelle-Verschlüsselung läuft separat über eine Passphrase, die das Mitglied beim Eintritt setzt und im Browser-LocalStorage hält (siehe Entscheidung 5).

**Alternatives considered**:
- *Passwort + bcrypt*: mehr Reibung, kein Sicherheitsgewinn bei Magic-Link mit kurzer TTL (10 min).
- *WebAuthn/Passkeys*: technisch elegant, aber UX-Hürde für die Zielgruppe (zweite Lebenshälfte, geringe Tech-Affinität).
- *NextAuth/Auth.js*: bringt zu viel — Adapter, Provider, Session-Strategien — wir wollen 80 Zeilen Code.

---

## 4. Zahlung: Stripe Checkout im EU-Mode

**Decision**: Stripe Checkout Sessions (gehostete Seite), SEPA + Karte enabled, kein Apple/Google Pay (die wieder Tracker laden), `payment_method_types: ['sepa_debit', 'card']`. Webhook-gesteuerte Abo-Aktivierung.

**Rationale**:
- Stripe ist EU-DSGVO-konform mit DPA (signierbar im Dashboard).
- Checkout-Sessions sind die einzige Stripe-Variante, die *keine* Stripe-Tracker in die Astro-Site einbettet — der Nutzer wird umgeleitet, kommt nach Zahlung zurück.
- Kein eigenes Card-Form → kein PCI-Scope auf unserer Seite.
- SEPA-Lastschrift ist Standard im DACH-Markt und passt zur jährlichen Abrechnungslogik.

**Alternatives considered**:
- *Mollie*: EU-nativ, gut, aber kleinere TS-Library und schwächere Webhook-Doku. Stripe wird häufiger gewartet.
- *Stripe Payment Element (embedded)*: lädt Stripe.js ins Frontend, bringt Telemetrie. Abgelehnt.
- *Paddle*: Merchant-of-Record-Modell wäre praktisch (USt-Abwicklung), aber teurer (5% + 50ct) und mehr Lock-in.
- *Lemon Squeezy*: gleiche MoR-Logik, US-Sitz, problematisch.

---

## 5. Zelle (geschlossener Schreibraum): Client-Side AES-GCM

**Decision**: Browser-side AES-GCM-Verschlüsselung mit `@noble/ciphers`. Schlüssel-Ableitung via Argon2id aus einer „Zell-Passphrase", die das Mitglied beim Eintritt setzt und nur lokal in `IndexedDB` (mit Browser-Sicherheits-API geschützt) speichert. Server speichert ausschließlich Chiffrate + nonce + Mitglieds-ID.

**Rationale**:
- Spec FR-023, FR-024: Server muss inhaltsblind sein. Auch Tobias und Begleiter dürfen technisch keinen Zugriff haben.
- AES-GCM mit 256-Bit-Key + Argon2id (mem=64MB, iter=3) ist Stand der Technik (OWASP 2025).
- `@noble/ciphers` ist die TypeScript-First-Lib mit Audit-Berichten und kleinem Bundle (~12 KB gzip).
- Passwort-Verlust = Datenverlust ist explizite Spec-Annahme; das Mitglied wird klar darüber informiert.

**Alternatives considered**:
- *libsodium-wrappers*: größer (~120 KB), Overkill.
- *Server-side Encryption mit KMS*: Server hätte technisch Zugriff → Spec-Verletzung.
- *PGP per Browser-Plugin*: UX zu komplex.
- *Keine Verschlüsselung, nur ACL*: Verletzt Spec; auch Admins dürfen nicht lesen können.

**Zell-Schlüssel-Management**:
- Beim ersten Login: Mitglied setzt eine Zell-Passphrase (anders als der Magic-Link-Account). Diese Passphrase wird NICHT zum Server gesendet.
- Argon2id leitet daraus einen 256-Bit-Schlüssel ab.
- Schlüssel wird in `IndexedDB` (origin-bound, schwerer zu exfiltrieren als LocalStorage) gespeichert mit Wrapping über `SubtleCrypto.exportKey` als nicht-extrahierbarer `CryptoKey` wo möglich.
- Bei Geräte-Wechsel muss das Mitglied die Passphrase erneut eingeben.
- Falls Mitglied die Passphrase vergisst: Wir bieten eine UI-Option „Zelle zurücksetzen" — alle alten Einträge werden serverseitig gelöscht, neue Passphrase wird gesetzt. Kein Recovery von Inhalten.

---

## 6. Cotidianum-Scheduler: Vercel Cron + Resend

**Decision**: Vercel Cron Jobs für Trigger (`/api/communitas/cron/morning`, `/noon`, `/evening`), Resend für Versand. Cron-Auth via `CRON_SECRET` Header.

**Rationale**:
- Vercel Cron ist im Free-Tier inkludiert (max. 2 Jobs auf Hobby, 40 auf Pro). Wir brauchen 5 Cron-Jobs (Morning täglich, Noon Mo/Mi/Fr, Evening täglich, 3-Monats-Schweige-Check wöchentlich, Stipendien-Zyklus jährlich) — Pro-Tier nötig.
- Cron triggert um xx:00 UTC; Endpoint berechnet Empfänger basierend auf Mitglieds-Zeitzone und sendet im Resend-Batch (`POST /v1/emails/batch`).
- Resend-Batch erlaubt bis 100 Mails pro Request — bei 200 Mitgliedern reichen 2–3 Batches pro Anker.
- Idempotenz: `anchor_sent_log` (siehe data-model.md) verhindert Doppelversand bei Cron-Re-Triggern.

**Alternatives considered**:
- *Inngest / Trigger.dev*: hübsche Workflow-Engines, aber zusätzliche Abhängigkeit + neue Tracker.
- *AWS EventBridge + Lambda*: höheres Setup, kein Vorteil bei dieser Größe.
- *Node-cron auf Vercel-Function*: läuft nicht, Functions sind kurzlebig.
- *Externes VPS mit systemd-Timer*: zusätzliche Infrastruktur entgegen der „bleibe minimal"-Linie.

**Schalen-Variation im Scheduler**:
- Inhalts-Pool liegt in `src/lib/communitas/content/anchors/{morning,noon}/{schale}/{wochentag}-*.md`.
- Scheduler wählt zufällig aus dem Pool, der zur Mitglieder-Schale UND Wochentag passt. Für Schalen, die noch keinen kuratierten Pool haben, wird der Default-Pool (`speculum` als Eintritts-Schale) genutzt.
- Audio-Dateien (Mittagsspuren) liegen unter `public/media/cotidianum/{schale}/{wochentag}-*.mp3` — Astro served sie statisch.

---

## 7. E-Mail-Templates: HTML schwarz auf weiß

**Decision**: Reine Inline-CSS-HTML-Templates, gerendert mit `mjml-react`-Alternative oder einfacher Astro-Component-to-String. Schwarz (#1c1917) auf Weiß (#fefefe), eine Serifenschrift (Georgia fallback Times), kein Logo, keine Bilder, kein Tracking-Pixel (`<img src="trk.gif"/>` explizit verboten), keine UTM-Parameter in Links.

**Rationale**:
- Spec FR-010: schwarz auf weiß, kein Logo, kein Bild.
- Resend setzt standardmäßig keine Tracking-Pixel; wir schalten zusätzlich `tracking: { opens: false, clicks: false }` in den API-Calls.
- Inline-CSS ist Standard, weil Mail-Clients (Outlook insbesondere) `<style>` aus dem Head strippen.

**Alternatives considered**:
- *MJML*: gut für komplexe Mails, aber wir wollen 5 Zeilen HTML, nicht 50.
- *React Email*: schick, aber bringt React-Runtime auf Server-Side; Astro-Native-Render reicht.

---

## 8. Versammlungs-Video (Stille Versammlung, Lese-Versammlung)

**Decision**: Jitsi Meet (`meet.jit.si`) für die Stille Versammlung. Lese-Versammlung wahlweise gleich. Kein Recording, kein Chat erforderlich.

**Rationale**:
- Jitsi ist Open Source, EU-Server möglich, keine Account-Pflicht für Teilnehmer.
- Die Stille Versammlung *darf* keine Aufzeichnung haben (Spec FR-028); Jitsi macht es leicht, Recording auszuschalten.
- Kein User-Tracking, kein Marketing-Pixel.
- Mitglieds-Anmeldung („Ich komme") generiert serverseitig einen Einmal-Link mit dem Termin-Raum-Namen.

**Alternatives considered**:
- *Zoom*: Default-Recording, Telemetrie, US-Hosting-Problematik.
- *Whereby*: EU, aber Free-Tier limitiert auf 100 Min — Lese-Versammlung läuft 90 Min, knapp.
- *BigBlueButton self-hosted*: schöne Tafel-Features, aber Hosting-Aufwand für 1×Monat Nutzung nicht gerechtfertigt.
- *Discord/Slack*: völlig falsche Atmosphäre.

---

## 9. Audio-Hosting (Mittagsspuren)

**Decision**: Statische MP3 unter `public/media/cotidianum/` direkt vom Astro-Build. Vercel CDN cached automatisch.

**Rationale**:
- Anti-Tracker-Constraint: kein Spotify-/Apple-Podcasts-Embed, kein SoundCloud (alle laden Trackers).
- Mittagsspuren sind kurz (5–8 min, ~5 MB pro Datei). Bei 7 Wochentagen × 7 Schalen = 49 Tracks max ≈ 250 MB. Vercel Static-Asset-Limits: kein Problem.
- Vorteil: Mitglied klickt im E-Mail-Link, Datei spielt im Browser-Default-Player. Kein Tracking-Overhead.

**Alternatives considered**:
- *S3 + signed URLs*: schöner für Zugriffskontrolle, aber überdimensioniert. Wenn die URL leaked, ist die Spur kein Geheimnis.
- *Backblaze B2*: günstig, aber unnötige zweite Infrastruktur.

---

## 10. Anonymität der Stipendien-Vergabe

**Decision**: Zwei getrennte Tabellen — `scholarship_pool_contributions` (Betragsmenge ohne identifizierende Verknüpfung außer Pool-Quartal) und `scholarship_grants` (Empfänger-Mitglied + Bewilligungsdatum, ohne Geber-Referenz). Verbindung nur über aggregierten Pool-Saldo.

**Rationale**:
- Spec FR-020, SC-007: Geber und Empfänger müssen anonym auf beiden Seiten sein.
- Buchhaltung kann den Pool-Stand sehen ohne 1:1-Zuordnung.
- Drei Begleiter (nicht Tobias selbst) treffen die Vergabe-Entscheidung; das System speichert nur die Bewilligung, nicht den Vergabe-Diskurs.

**Alternatives considered**:
- *Ein gemeinsames Tabellenschema mit „masked_donor_id"*: anfällig für Re-Identifikation per Korrelation. Abgelehnt.
- *Hashed donor IDs*: gleiches Problem bei kleinen N.

---

## 11. Internationalisierung: bleibt DE-only Phase 1

**Decision**: Communitas-Routen liegen unter `/communitas/` (DE) ohne Locale-Prefix. Die viersprachige Site verlinkt aus EN/LA/GRC nur mit einem Hinweis: „Diese Versammlung wird zurzeit auf Deutsch geführt. Englischsprachige Aufnahme folgt 2027."

**Rationale**:
- Spec Assumption „Primärsprache Deutsch": Tobias und Begleiter verfassen nur auf Deutsch.
- Übersetzung des Manifests in EN/LA/GRC wäre ironisch — die Site hat zwar Latin-/Greek-Default, aber das ist Brand-Signal, kein lebender Sprachraum mit täglichen Mails.
- Wenn Phase 2 international wird, würde das Datenmodell `member.preferred_locale` ohnehin bereits stützen (siehe data-model.md).

**Alternatives considered**:
- *Sofort 4-sprachig*: Verzettelung; Tobias müsste alle Anker in 4 Sprachen kuratieren — nicht leistbar.

---

## Resolution Summary

| Topic | Decision | Status |
|---|---|---|
| Membership-Plattform | Eigenes Schema in Postgres/Neon | ✓ |
| Datenbank | Neon Free, postgres.js | ✓ |
| Auth | Magic-Link via Resend | ✓ |
| Zahlung | Stripe Checkout SEPA + Card | ✓ |
| Zell-Encryption | Client-Side AES-GCM mit @noble/ciphers | ✓ |
| Scheduler | Vercel Cron + Resend Batch | ✓ |
| E-Mail-Templates | Inline-HTML, kein Tracking | ✓ |
| Video | Jitsi Meet | ✓ |
| Audio | Static MP3 auf Vercel | ✓ |
| Stipendien | Zwei getrennte Tabellen | ✓ |
| i18n | DE-only Phase 1, Schema bereitet erweitert | ✓ |

Keine offenen NEEDS-CLARIFICATION-Punkte mehr. Phase 1 (Datenmodell und Contracts) kann beginnen.
