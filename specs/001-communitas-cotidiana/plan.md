# Implementation Plan: Communitas Cotidiana

**Branch**: `001-communitas-cotidiana` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-communitas-cotidiana/spec.md`

## Summary

Communitas Cotidiana erweitert die bestehende `tobiasoberrauch.de`-Site (Astro 6 auf Vercel, viersprachig LA/DE/EN/GRC) um eine kontemplative Mitglieder-Architektur unter `/communitas/` — bestehend aus öffentlicher Schwelle (Landing + Manifest + Aufnahmeformular), tägliche E-Mail-Anker-Pipeline, drei Mitgliedsstufen mit DSGVO-konformer Zahlung, client-verschlüsseltem Schreibraum („Zelle"), manueller Briefkreis-Zuteilung, und Reise-Verwaltung. Die Implementierung respektiert die ethische Architektur der Versammlung: keine Tracker, keine Gamification, keine Sales-Funnel-Logik, vier-Stimmen-Autorschaft als Default, vollständige Datenlöschung beim Austritt.

Technischer Kern: bestehende Astro-Site bekommt einen serverseitigen Mitgliedsbereich (Astro-Endpoints + Postgres via Neon Free Tier), Cotidianum-Scheduler über Vercel Cron + Resend, Zahlung über Stripe Checkout im EU-Mode, Zelle mit Browser-AES-GCM-Verschlüsselung wo der Server nur Chiffrate sieht. NORDSTERN-Integration und Schalen-Variation sind Datenmodell-Entscheidungen, nicht separate Subsysteme.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 24 (Vercel runtime), Astro 6.1.x
**Primary Dependencies**: Astro 6 (existing), React 19 (existing, für interaktive Form-Components), Resend SDK (existing, erweitert für Audiences + transactional), Stripe Node SDK (neu), `postgres` (porsager/postgres, neu — leichtgewichtiger als Prisma), `@noble/ciphers` (neu, für client-side AES-GCM in der Zelle), Vercel Cron (build-in)
**Storage**: PostgreSQL via Neon Free Tier (3GB, EU-Region Frankfurt für DSGVO). Schemas siehe `data-model.md`. Keine NoSQL/KV-Komponente — eine Datenbank reicht für die erste Jahresgröße.
**Testing**: Vitest für Unit/Logic-Tests (Scheduler-Wochentag-Logik, Schalen-Variation, Anonymisierungs-Funktionen); Playwright für E2E-Smoke (Aufnahmeformular, Zahlung-Stub, Login). Bestehende Astro-Builds bleiben unverändert.
**Target Platform**: Vercel Serverless (existing). EU-Region für alle Functions (Frankfurt fra1) explizit konfiguriert.
**Project Type**: Web application (Erweiterung der bestehenden Astro-Site, kein neues Repo)
**Performance Goals**: Anker-Mail-Versand innerhalb ±5 Minuten der geplanten Stunde; Landing-Page-LCP < 1.5s; Aufnahmeformular-Submit < 2s p95; Zelle-Eintrags-Speicherung < 500ms inkl. Verschlüsselung.
**Constraints**:
- DSGVO-Hostings (EU-Region Pflicht für DB, Email-Service, Payments)
- Keine externen Marketing-Tracker auf öffentlichen oder Member-Routen (Meta, LinkedIn, Google Ads)
- Vercel Analytics + optional OpenPanel dürfen nicht in Member-Routen aktiv sein
- Client-side encryption für die Zelle: Server muss inhaltsblind sein
- Passwortverlust = Datenverlust ist akzeptiert (siehe Spec Assumptions)
- Keine externen Aufzeichnungen von Videoversammlungen (kein Zoom-Cloud-Recording, kein YouTube-Live)

**Scale/Scope**:
- Jahr 1: max ~200 Mitglieder, Spitze 12 Reisen/Jahr, 12 Stipendien/Jahr
- Tägliche Anker-Mails: 3 × 200 = max 600 Mails/Tag (Mo/Mi/Fr), 400/Tag (Di/Do)
- Resend Free Tier (3.000 Mails/Monat) reicht bis ~40 Mitglieder; Pro-Tier ($20/Monat) ab dann
- Zelle: ~50 Einträge/Mitglied/Jahr × 200 = 10.000 verschlüsselte Datensätze in Year 1
- Datenbankgröße Year 1: weit unter 1 GB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: PASS (mit Hinweis)

Das Constitution-File unter `.specify/memory/constitution.md` enthält ausschließlich Template-Platzhalter (keine ratifizierten Prinzipien). Es gibt daher keine konkreten Gate-Kriterien, gegen die geprüft werden müsste. Als operativer Ersatz werden die ethischen Constraints aus der Spec selbst behandelt wie Verfassungsregeln und in jedem Phase-Gate validiert:

1. **Keine externen Marketing-Tracker** auf öffentlichen oder Member-Routen → in Phase 0 (Research) und Phase 1 (Contracts) explizit verifiziert
2. **Client-side Encryption der Zelle** → Phase 1 Datenmodell und Contracts müssen zeigen, dass Server-Storage ausschließlich Chiffrate erhält
3. **Vier-Stimmen-Default** für Sonntags-Essays/Vollmond-Briefe → Phase 1 Datenmodell macht `author_id` nicht-nullbar und stellt mindestens vier Begleiter-Konten als Seed-Daten bereit
4. **Anonymität der Stipendien-Vergabe** → Phase 1 Datenmodell trennt Geber-Pool und Empfänger ohne identifizierende Verknüpfung

Bei Re-Check nach Phase 1: keine Verletzungen erwartet (siehe Complexity Tracking — leer).

## Project Structure

### Documentation (this feature)

```text
specs/001-communitas-cotidiana/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (technology decisions)
├── data-model.md        # Phase 1 output (entities + migrations)
├── quickstart.md        # Phase 1 output (developer onboarding)
├── contracts/           # Phase 1 output (HTTP/email interface contracts)
│   ├── http-api.md
│   ├── email-templates.md
│   └── cron-schedule.md
└── checklists/
    └── requirements.md  # Spec-quality validation
```

### Source Code (repository root)

Die Implementierung erweitert die bestehende Astro-Site. Keine neuen Top-Level-Pakete; alles liegt innerhalb des Monorepo-Roots `/Users/tobiasoberrauch/Repositories/tobiasoberrauch/tobiasoberrauch.de/`:

```text
src/
├── pages/
│   ├── communitas/                  # Öffentliche Schwelle (DE primär)
│   │   ├── index.astro              # Landing + Manifest + 3-Absatz-Hero
│   │   ├── manifest.astro           # Vollständiges Manifest H1
│   │   ├── glossar.astro            # Wörterbuch H2
│   │   ├── stille.astro             # /communitas/stille — Anlaufstellen + Therapie-Abgrenzung
│   │   ├── bewerbung.astro          # Aufnahmeformular
│   │   └── danke.astro              # Bestätigungs-Seite nach Submit
│   ├── communitas-mitglied/         # Geschützter Mitglieder-Bereich (nach Login)
│   │   ├── index.astro              # Tages-Übersicht (heutige Anker, Schale, Briefkreis)
│   │   ├── zelle.astro              # Client-verschlüsselte Schreibräume
│   │   ├── kreis.astro              # Briefkreis-Lesemaske + Schreibmaske
│   │   ├── reisen.astro             # Reise-Buchung
│   │   └── konto.astro              # Stufe ändern, austreten, Daten-Export
│   └── api/
│       └── communitas/
│           ├── apply.ts             # POST: Bewerbung annehmen
│           ├── auth/                # Login/Logout/Magic-Link
│           │   ├── magic-link.ts
│           │   └── session.ts
│           ├── stripe/              # Checkout + Webhook
│           │   ├── checkout.ts
│           │   └── webhook.ts
│           ├── cell/                # Zelle: nur Chiffrate, server-blind
│           │   ├── list.ts
│           │   ├── save.ts
│           │   └── delete.ts
│           ├── kreis/               # Briefkreis-Operations (auth required)
│           │   └── send.ts
│           ├── reisen/              # Reise-Anmeldung
│           │   └── book.ts
│           ├── cron/                # Vercel-Cron-Endpunkte (Auth via header)
│           │   ├── morning.ts       # 6:00–8:00 Morgensammlung
│           │   ├── noon.ts          # Mo/Mi/Fr 12:00 Mittagsinnehalten
│           │   ├── evening.ts       # 21:00 Abendrückblick
│           │   ├── three-month-check.ts  # Sanfte Wiederfrage nach 90 Tagen
│           │   └── scholarship-cycle.ts  # Jährlicher Stipendien-Topf
│           └── admin/               # Tobias/Begleiter (rolle-geschützt)
│               ├── applications.ts
│               ├── briefkreise.ts
│               └── members.ts
├── components/
│   └── communitas/
│       ├── ApplicationForm.astro
│       ├── Manifest.astro
│       ├── Glossar.astro
│       ├── Anchor.astro              # E-Mail-Template-Komponente (server-side render zu HTML)
│       ├── CellEditor.tsx            # Client-only React-Komponente mit @noble/ciphers
│       ├── KreisLetter.tsx
│       └── TierCard.astro
├── lib/
│   └── communitas/
│       ├── db.ts                     # postgres.js-Client + Migrations-Runner
│       ├── schedule.ts               # Wochenfärbung + Schalen-Selektion + Zeitzone
│       ├── mailer.ts                 # Resend-Client + Anchor-HTML-Renderer
│       ├── crypto.ts                 # Server-Verschlüsselung für „Brief an sich selbst" (Postzustellung)
│       ├── client-crypto.ts          # Browser-AES-GCM Helpers für die Zelle
│       ├── auth.ts                   # Magic-Link-Token + Session-Cookies
│       ├── stripe.ts                 # Stripe-Client + Tier-Mapping
│       └── content/                  # Versammlungs-Inhalte (kuratiert von Tobias+Begleitern)
│           ├── anchors/
│           │   ├── morning/          # Markdown-Pool pro Wochentag/Schale
│           │   ├── noon/             # Audio-Manifest pro Wochentag/Schale
│           │   └── evening.md        # Drei feste Fragen
│           └── manifesto.md          # Manifest H1 als Markdown
├── i18n/                             # Existing — Communitas bleibt DE-only Phase 1
└── styles/
    └── communitas.css                # Schwarz auf Weiß, schlicht, keine Animation außer Reveal

migrations/
└── communitas/
    ├── 001_init.sql                  # members, applications, schales
    ├── 002_briefkreise.sql           # kreise, kreis_messages
    ├── 003_cell.sql                  # cell_entries (verschlüsselt)
    ├── 004_payments.sql              # subscriptions, scholarships_pool, stipends
    ├── 005_retreats.sql              # retreats, retreat_bookings
    └── 006_anchor_log.sql            # anchor_sent_log (für 3-Monats-Schweige-Erkennung)

tests/
└── communitas/
    ├── unit/
    │   ├── schedule.test.ts
    │   ├── client-crypto.test.ts
    │   └── anonymizer.test.ts
    └── e2e/
        ├── application-flow.spec.ts
        └── cell-roundtrip.spec.ts
```

**Structure Decision**: Web-Application-Erweiterung der bestehenden Astro-Site. Keine separaten Backend-/Frontend-Verzeichnisse, weil Astro Endpoints und Pages im gleichen Tree behält. Source-Layout folgt Astro-Konvention (`src/pages`, `src/components`, `src/lib`). Server-only Logik in `src/lib/communitas/`, client-only Logik in `*.tsx`-Komponenten mit `client:load`. Migrationen liegen außerhalb `src/` weil sie nicht gebündelt werden müssen.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Constitution Check ist mit „PASS (mit Hinweis)" beendet. Keine Verletzungen.
