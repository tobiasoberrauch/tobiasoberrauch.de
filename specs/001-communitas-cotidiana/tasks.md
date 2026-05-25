---
description: "Task list for Communitas Cotidiana implementation"
---

# Tasks: Communitas Cotidiana

**Input**: Design documents from `/specs/001-communitas-cotidiana/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `001-communitas-cotidiana`

**Tests**: Selektive Unit-Tests (Scheduler-Wochentag, Client-Crypto-Roundtrip, Stipendien-Anonymität) und E2E-Smoke (Aufnahme, Cell-Roundtrip) sind im Plan vorgesehen — sie sind in den User-Story-Phasen als Tasks aufgeführt. Keine vollständige TDD-Disziplin gefordert; Spec verlangt sie nicht.

**Organization**: Tasks gruppiert nach User Story aus spec.md (P1, P2, P2, P3, P3). MVP-Endpunkt nach Phase 3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelisierbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: User-Story-Zuordnung (US1–US5)
- Pfade sind absolut zur Repo-Wurzel `~/Repositories/tobiasoberrauch/tobiasoberrauch.de/`

## Path Conventions

Erweiterung der bestehenden Astro-Site. Alle Pfade relativ zur Repo-Wurzel:

- `src/pages/communitas/` — öffentliche Schwelle
- `src/pages/communitas-mitglied/` — Mitgliederbereich (auth)
- `src/pages/api/communitas/` — Server-Endpoints
- `src/lib/communitas/` — Server-Logik
- `src/components/communitas/` — UI-Komponenten
- `src/lib/communitas/content/` — kuratierte Inhalte (Markdown)
- `migrations/communitas/` — SQL-Migrationen
- `tests/communitas/` — Vitest + Playwright

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Projekt-Erweiterung vorbereiten — Dependencies, Verzeichnisse, Vercel-Config.

- [ ] T001 Add new dependencies to `package.json`: `postgres@^3.4`, `stripe@^15`, `@noble/ciphers@^1`, `@noble/hashes@^1` and dev-dependencies `vitest@^1`, `playwright@^1`, `@playwright/test@^1` — then run `npm install`
- [ ] T002 [P] Create directory structure: `src/pages/communitas/`, `src/pages/communitas-mitglied/`, `src/pages/api/communitas/`, `src/lib/communitas/`, `src/components/communitas/`, `src/lib/communitas/content/anchors/{morning,noon,evening}`, `migrations/communitas/`, `tests/communitas/{unit,e2e}/`, `public/media/cotidianum/`
- [ ] T003 [P] Create `vitest.config.ts` at repo root with TypeScript support and `tests/communitas/unit/**` glob
- [ ] T004 [P] Create `playwright.config.ts` at repo root with `tests/communitas/e2e/**` glob and Vercel-preview baseURL config
- [ ] T005 [P] Add `vercel.json` (or extend existing) with the `crons` section from `specs/001-communitas-cotidiana/contracts/cron-schedule.md` (6 cron jobs) and explicit `regions: ["fra1"]` for all `/api/communitas/*` functions
- [ ] T006 [P] Extend `.env.example` with all Communitas env vars from `specs/001-communitas-cotidiana/quickstart.md` (COMMUNITAS_DATABASE_URL, COMMUNITAS_SESSION_SECRET, LETTER_ENCRYPTION_KEY, CRON_SECRET, STRIPE_*, RESEND_COMMUNITAS_AUDIENCE_ID, RESEND_FROM_EMAIL, RESEND_REPLY_TO_EMAIL, COMMUNITAS_ADMIN_NOTIFY_EMAIL)
- [ ] T007 [P] Add npm scripts to `package.json`: `"communitas:migrate"`, `"test:unit"`, `"test:e2e"` (per quickstart.md)
- [ ] T008 [P] Create `src/styles/communitas.css` with the black-on-white token set (color tokens `--c-paper #fefefe`, `--c-ink #1c1917`, `--c-rule #d6d3d1`, `--c-muted #78716c`, Georgia serif font stack, no animations beyond opacity-reveal)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Datenbank, Auth, Mailer, Crypto-Helpers — Grundlagen, die alle User Stories brauchen.

**⚠️ CRITICAL**: Keine User-Story-Arbeit darf vor diesem Checkpoint beginnen.

- [ ] T009 Write migration `migrations/communitas/001_init.sql` per data-model.md: `CREATE EXTENSION IF NOT EXISTS citext`, then `schales`, `applications`, `members`, `sessions`, `magic_links` tables, indices, and the schales seed INSERT (7 rows: speculum/silentium/rota/velum/logos/vox/vestigium)
- [ ] T010 [P] Write migration `migrations/communitas/002_briefkreise.sql`: `kreise`, `kreis_members`, `kreis_messages` tables and indices
- [ ] T011 [P] Write migration `migrations/communitas/003_cell.sql`: `cell_entries` table and indices
- [ ] T012 [P] Write migration `migrations/communitas/004_payments.sql`: `subscriptions`, `scholarship_pool_contributions`, `scholarship_grants` tables (no FK between the latter two — anonymity invariant)
- [ ] T013 [P] Write migration `migrations/communitas/005_retreats.sql`: `retreats`, `retreat_bookings` tables and indices
- [ ] T014 [P] Write migration `migrations/communitas/006_anchor_log.sql`: `anker_sent_log`, `full_moon_letters` tables and indices; add `members.last_quiet_check_at` column for 3-month-check throttling
- [ ] T015 Implement `src/lib/communitas/db.ts`: `postgres.js` client singleton with connection pooling, migration runner that reads files from `migrations/communitas/` sorted by name and applies each idempotently, and a `migrate` CLI wrapper invoked by `npm run communitas:migrate`
- [ ] T016 Implement `src/lib/communitas/crypto.ts` (server-side): AES-GCM encrypt/decrypt helpers using Node `crypto.subtle` keyed by `LETTER_ENCRYPTION_KEY` env var; used ONLY for the „Brief an sich selbst" round-trip (no other server-side member content)
- [ ] T017 [P] Implement `src/lib/communitas/client-crypto.ts` (browser-only): AES-GCM encrypt/decrypt + Argon2id key derivation via `@noble/ciphers` and `@noble/hashes`, IndexedDB key storage with origin-bound key wrapping, passphrase-reset that wipes IndexedDB key
- [ ] T018 Implement `src/lib/communitas/auth.ts`: magic-link token generation (32 random bytes → SHA-256 hash for DB, raw for email link), `createSession(memberId)`, `getSession(request)` reading the `communitas_session` httpOnly cookie, signed with `COMMUNITAS_SESSION_SECRET`, 7-day expiry, role-check helpers (`requireMember`, `requireCompanion`)
- [ ] T019 Implement `src/lib/communitas/mailer.ts`: Resend client wrapper that always sends with `tracking: { opens: false, clicks: false }`, sets `List-Unsubscribe` and `List-Unsubscribe-Post` headers per RFC 8058, refuses to send when `RESEND_API_KEY` is missing (returns `not_configured`)
- [ ] T020 [P] Implement `src/lib/communitas/email-render.ts`: render Astro-component-to-string for inline-CSS HTML mails, inject the common footer from contracts/email-templates.md, reject any rendered HTML containing `<img src="trk` (anti-tracking-pixel check)
- [ ] T021 [P] Implement `src/lib/communitas/schedule.ts`: pure functions `getCommunitasWeekday(date)` returning `'spiegel'|'stille'|'spur'|'begegnung'|'versöhnung'|'werk'|'sammlung'`, `pickAnchorForSchaleAndWeekday(schale, weekday, kind)` selecting a Markdown file from the content pools, and `isMiddayActiveDay(date)` returning true only for Mon/Wed/Fri
- [ ] T022 [P] Write unit test `tests/communitas/unit/schedule.test.ts` covering: weekday mapping for all 7 days, Mon=Spiegel, Tue=Stille, midday-active = M/W/F only, Sun=Sammlung
- [ ] T023 Run `npm run communitas:migrate` against a local Neon dev DB to verify all 6 migrations apply cleanly; then connect and verify `SELECT count(*) FROM schales` returns 7
- [ ] T024 [P] Extend `src/layouts/Base.astro` to exclude Vercel Analytics `<Analytics />` AND the OpenPanel `<script>` on paths starting with `/communitas-mitglied` (anti-tracker constraint) via `const isMemberArea = Astro.url.pathname.startsWith('/communitas-mitglied');`
- [ ] T025 [P] Create seed-data helper `src/lib/communitas/seed.ts` (dev-only): insert Tobias (`role='founder'`) and three placeholder Begleiter (`role='companion'`) so the four-voice constraint can be exercised in dev; gated by `NODE_ENV !== 'production'`

**Checkpoint**: Foundation ready — User-Story-Arbeit kann beginnen.

---

## Phase 3: User Story 1 — Die ruhige Tür (Priority: P1) 🎯 MVP

**Goal**: Eine schlichte Landing-Seite mit Manifest, Wörterbuch, Anlaufstellen, und Aufnahmeformular. Bewerbungen werden mit verschlüsseltem „Brief an sich selbst" gespeichert. Tobias kann via Admin-Endpoint Bewerbungen annehmen/ablehnen, und der Cron sendet ungeöffnete Briefe ein Jahr später zurück.

**Independent Test**: Besucher öffnet `/communitas/`, liest Manifest, füllt Formular aus, bekommt Bestätigungs-Mail; Tobias setzt in der DB den Status auf `accepted`, Annahme-Mail mit Checkout-Link wird versendet; ein Jahr später sendet `return-letters` Cron den Brief zurück.

### Implementation for User Story 1

- [ ] T026 [P] [US1] Write Markdown content `src/lib/communitas/content/manifesto.md` with the full Manifest from spec.md §H1 (German)
- [ ] T027 [P] [US1] Write Markdown content `src/lib/communitas/content/glossar.md` with the 50-entry vocabulary from spec.md §H2
- [ ] T028 [P] [US1] Write Markdown content `src/lib/communitas/content/stille.md` with the therapy-boundary statement and concrete hotlines (Telefonseelsorge 0800-111-0-111, 0800-111-0-222, Notruf 112)
- [ ] T029 [P] [US1] Implement `src/components/communitas/Manifest.astro` rendering manifesto.md as flowing prose (Georgia serif, max-width 38rem, no card decomposition)
- [ ] T030 [P] [US1] Implement `src/components/communitas/Glossar.astro` rendering glossar.md alphabetically as a `<dl>` list, no search, no filter
- [ ] T031 [P] [US1] Implement `src/components/communitas/ApplicationForm.astro` with fields: name (required), email (required), question (required, max 2000), letter_to_self (optional, max 10000, with note „Wird nicht gelesen, wird in einem Jahr zurückgesendet"), desired_tier (radio: basis/voll/inner_circle), consent (checkbox required) — submits via fetch POST to /api/communitas/apply
- [ ] T032 [US1] Implement page `src/pages/communitas/index.astro` — three-paragraph hero, link to manifest/glossar/stille/bewerbung, embed `<Manifest>` excerpt and a single application CTA. Use `Base.astro` layout with locale='de'
- [ ] T033 [US1] Implement page `src/pages/communitas/manifest.astro` rendering the full `<Manifest>`
- [ ] T034 [US1] Implement page `src/pages/communitas/glossar.astro` rendering `<Glossar>`
- [ ] T035 [US1] Implement page `src/pages/communitas/stille.astro` rendering boundary statement + hotlines
- [ ] T036 [US1] Implement page `src/pages/communitas/bewerbung.astro` rendering `<ApplicationForm>` with framing copy
- [ ] T037 [US1] Implement page `src/pages/communitas/danke.astro` shown after submit — sparse confirmation, no tracking, no animations
- [ ] T038 [US1] Implement endpoint `src/pages/api/communitas/apply.ts` (`export const prerender = false`): validate body (Zod or manual), check 30-day duplicate, encrypt `letter_to_self` via `src/lib/communitas/crypto.ts`, insert `applications` row, set `return_letter_at = current_date + interval '1 year'`, send confirmation email (template 1) and admin notify; respond per http-api.md
- [ ] T039 [P] [US1] Add email template renderer `src/lib/communitas/email-templates/confirmation.astro` (template 1 from email-templates.md)
- [ ] T040 [P] [US1] Add email template renderer `src/lib/communitas/email-templates/acceptance.astro` (template 2)
- [ ] T041 [P] [US1] Add email template renderer `src/lib/communitas/email-templates/decline.astro` (template 3)
- [ ] T042 [P] [US1] Add email template renderer `src/lib/communitas/email-templates/return-letter.astro` (template 12)
- [ ] T043 [US1] Implement endpoint `src/pages/api/communitas/admin/applications.ts` (GET): list applications via `requireCompanion`, never expose `letter_to_self` content (only `letter_to_self_present: bool`)
- [ ] T044 [US1] Implement endpoint `src/pages/api/communitas/admin/applications/[id].ts` (PATCH): change status; if `accepted` create `members` row + (later) trigger checkout link, send template 2; if `declined` send template 3
- [ ] T045 [P] [US1] Implement cron endpoint `src/pages/api/communitas/cron/return-letters.ts`: select `applications WHERE return_letter_at = current_date AND letter_returned_at IS NULL`, decrypt letter, render template 12, send via mailer, set `letter_returned_at = now()`
- [ ] T046 [P] [US1] Implement admin page `src/pages/communitas-mitglied/admin/bewerbungen.astro` (auth: companion+) showing the application list with status buttons
- [ ] T047 [P] [US1] Write unit test `tests/communitas/unit/apply-validation.test.ts` covering: invalid email rejection, missing consent rejection, 30-day duplicate detection, letter_to_self encryption round-trip
- [ ] T048 [P] [US1] Write E2E test `tests/communitas/e2e/application-flow.spec.ts`: visit `/communitas/`, navigate to bewerbung, fill form, submit, assert 202 + redirect to /danke
- [ ] T049 [US1] Verify no marketing trackers on `/communitas/*` routes: View-source check that no Meta/LinkedIn/Google Ads pixels appear, and Vercel Analytics IS active on public routes per FR-008 (analytics on public, not member)

**Checkpoint**: User Story 1 funktioniert — MVP ist deploybar. Eine Person kann sich bewerben, Tobias kann annehmen, der Brief kommt nach einem Jahr zurück.

---

## Phase 4: User Story 2 — Das tägliche Cotidianum (Priority: P2)

**Goal**: Aktive Mitglieder empfangen täglich drei E-Mail-Anker (Morgen, Mittag mit Audio, Abend) — gefärbt nach Wochentag und kuratiert nach Schale. Drei-Monats-Schweige-Erkennung versendet die sanfte Wiederfrage.

**Independent Test**: Test-Mitglied wird per Magic-Link eingeloggt, ist in Schale Speculum; Cron-Endpoints werden mit `Authorization: Bearer CRON_SECRET` getriggert; Morgens kommt Mail mit Spiegel-Frage, Mittwochs zur Mittagszeit kommt Audio-Link für Mittwoch-Speculum-Spur, Donnerstag kommt KEIN Mittagsmail, Abends kommen die drei festen Fragen.

### Implementation for User Story 2

- [ ] T050 [P] [US2] Write content pool `src/lib/communitas/content/anchors/morning/speculum/monday.md` (Spiegel-Tag) — exemplary: a Rilke verse + Tagesfrage; create stub files for all 7 schales × 7 weekdays (49 files), Speculum and Silentium populated, others with TODO placeholder
- [ ] T051 [P] [US2] Write `src/lib/communitas/content/anchors/evening.md` with the three fixed questions („Wo war ich heute wach? Wo war ich heute schlafend? Wofür danke ich?")
- [ ] T052 [P] [US2] Place placeholder MP3 files `public/media/cotidianum/{speculum,silentium}/{monday,wednesday,friday}.mp3` (silent 5-second tracks for now; real audio comes from Tobias' recording later) — document in README that real audio is to be recorded
- [ ] T053 [P] [US2] Implement endpoint `src/pages/api/communitas/auth/magic-link.ts` (POST): validate email; if found in `members`, generate token, store hash in `magic_links` (10 min TTL), send template 4
- [ ] T054 [P] [US2] Implement page `src/pages/communitas-mitglied/login.astro`: reads `?t=<token>` from query, verifies hash, creates session, marks `magic_links.used_at`, redirects to `/communitas-mitglied/`
- [ ] T055 [US2] Implement endpoint `src/pages/api/communitas/me.ts` (GET, auth required): return member profile + today's anchor status from `anker_sent_log`
- [ ] T056 [US2] Implement page `src/pages/communitas-mitglied/index.astro`: dashboard showing display_name, current schale, today's communitas-weekday, anchors received/pending
- [ ] T057 [P] [US2] Add email template renderer `src/lib/communitas/email-templates/morning.astro` (template 5)
- [ ] T058 [P] [US2] Add email template renderer `src/lib/communitas/email-templates/noon.astro` (template 6 — links to MP3, no embed)
- [ ] T059 [P] [US2] Add email template renderer `src/lib/communitas/email-templates/evening.astro` (template 7)
- [ ] T060 [P] [US2] Add email template renderer `src/lib/communitas/email-templates/magic-link.astro` (template 4)
- [ ] T061 [P] [US2] Add email template renderer `src/lib/communitas/email-templates/quiet-check.astro` (template 9 — exact wording per spec)
- [ ] T062 [US2] Implement cron endpoint `src/pages/api/communitas/cron/morning.ts`: auth via CRON_SECRET header, query active members per timezone (Phase-1: DACH only), filter by `anker_sent_log` not having today's morning, pick content via `schedule.ts`, render template 5, send Resend batch (max 100/batch), insert log rows with `ON CONFLICT DO NOTHING`
- [ ] T063 [US2] Implement cron endpoint `src/pages/api/communitas/cron/noon.ts`: same as morning but only Mon/Wed/Fri (`isMiddayActiveDay`), no-op response on Tue/Thu, attach audio URL link in body
- [ ] T064 [US2] Implement cron endpoint `src/pages/api/communitas/cron/evening.ts`: same as morning but for evening; for Voll+InnerCircle include cell-URL footer link
- [ ] T065 [US2] Implement cron endpoint `src/pages/api/communitas/cron/three-month-check.ts`: query members with no `cell_entries`/`kreis_messages`/`retreat_bookings` activity in past 90 days AND no `members.last_quiet_check_at` in past 180 days; send template 9; update `last_quiet_check_at = now()`
- [ ] T066 [P] [US2] Write unit test `tests/communitas/unit/anchor-content-selection.test.ts`: covers `pickAnchorForSchaleAndWeekday()` deterministic selection and graceful fallback to speculum when target schale pool is empty
- [ ] T067 [P] [US2] Write unit test `tests/communitas/unit/cron-idempotency.test.ts`: cron-endpoint called twice for the same day → only one row in `anker_sent_log`
- [ ] T068 [US2] Verify no tracking pixels in rendered email HTML (assert via `email-render.ts` lint that `<img` only allowed for content-absolute URLs from our own static hosting, never `*.gif` or 1×1)

**Checkpoint**: Mitglieder erhalten täglich Anker. Drei-Monats-Schweige löst die ruhige Wiederfrage aus.

---

## Phase 5: User Story 3 — Die Schwelle der Verbindlichkeit (Priority: P2)

**Goal**: Aufgenommenes Mitglied wählt Stufe (Basis/Voll/Inner Circle), zahlt einmalig pro Jahr via Stripe Checkout SEPA+Karte. Stipendien-Pool wird automatisch aus Inner-Circle- und NORDSTERN-Beiträgen gespeist; Jahresvergabe-Trigger im November läuft anonym.

**Independent Test**: Nach Annahme erhält Mitglied Checkout-Link, schließt Test-Zahlung via Stripe-Test-Karte ab, Webhook setzt `subscriptions.status='active'`; Mitglied erhält Willkommens-Mail; bei Renewal-Fehler kommt eine einzelne sachliche Erinnerung; Stipendien-Cron im Nov triggert Vergabe-Mail an drei Begleiter mit anonymem Pool-Saldo.

### Implementation for User Story 3

- [ ] T069 [P] [US3] Implement `src/lib/communitas/stripe.ts`: Stripe client init, `createCheckoutSession({memberId, tier})` mapping tier → STRIPE_PRICE_* env var, `payment_method_types: ['sepa_debit', 'card']`, locale `'de'`, customer_email from member
- [ ] T070 [US3] Implement endpoint `src/pages/api/communitas/stripe/checkout.ts` (POST, auth required): create Stripe Checkout Session, return `{ url }`
- [ ] T071 [US3] Implement endpoint `src/pages/api/communitas/stripe/webhook.ts` (POST, raw body): verify signature via `STRIPE_WEBHOOK_SECRET`; handle events: `checkout.session.completed` (insert subscription + send template 13), `invoice.payment_failed` (set `past_due`, send ONE sachliche Erinnerung), `customer.subscription.deleted` (set `cancelled`, NO re-engagement), `customer.subscription.updated` (sync status); 200 ack always
- [ ] T072 [P] [US3] Add email template renderer `src/lib/communitas/email-templates/welcome.astro` (template 13 „Du bist da.")
- [ ] T073 [P] [US3] Add email template renderer `src/lib/communitas/email-templates/payment-failed.astro` (one-time sachliche Erinnerung; explicitly no second send)
- [ ] T074 [P] [US3] Add email template renderer `src/lib/communitas/email-templates/renewal-reminder.astro` (template 11 with `one_click_cancel_url`)
- [ ] T075 [US3] Implement endpoint `src/pages/api/communitas/subscription/cancel.ts` (GET or POST with token, auth optional): set `cancel_at_period_end = true` in DB and Stripe; respond with a quiet confirmation HTML page; no „Are you sure?" modal
- [ ] T076 [P] [US3] Implement page `src/pages/communitas-mitglied/konto.astro`: show current tier, renewal date, link to data export (US4 dependent), `cancel`/`pause` actions, the one-tier-change-per-year governance copy
- [ ] T077 [P] [US3] Implement component `src/components/communitas/TierCard.astro` for use in the accept-flow's email and acceptance landing — three cards, one button each, NO comparison table with checkmarks
- [ ] T078 [US3] Implement cron `src/pages/api/communitas/cron/scholarship-cycle.ts` (Nov 1, 12:00 UTC): aggregate pool balance (`SUM(amount_cents BY year) - SUM(active scholarship_grants × 360000)`); send Begleiter trigger email (template 14) listing N possible grants; do not auto-grant
- [ ] T079 [US3] Implement admin endpoint `src/pages/api/communitas/admin/scholarships/grant.ts` (POST, auth: companion): insert `scholarship_grants` row, link to a subscription with `status='scholarship'` (NO FK to pool contribution — anonymity); requires `approved_by_three=true` set only after three companion signatures collected
- [ ] T080 [P] [US3] On every successful Inner-Circle/NORDSTERN payment in webhook, automatically insert 5 % into `scholarship_pool_contributions` with `source='inner_circle_share'` or `'nordstern_share'`; verify no member-id link recorded
- [ ] T081 [P] [US3] Write unit test `tests/communitas/unit/scholarship-anonymity.test.ts`: assert that no query joining `scholarship_pool_contributions` and `scholarship_grants` returns a 1:1 mapping; assert the contributions table has no `member_id` or `donor_id` column
- [ ] T082 [P] [US3] Write unit test `tests/communitas/unit/payment-state-machine.test.ts`: cover transitions active → past_due → cancelled and active → paused → active; no transition produces a re-engagement event
- [ ] T083 [US3] Verify in the Stripe dashboard that the German DPA is signed and SEPA Direct Debit is enabled (operational checklist, not code) — document in `specs/001-communitas-cotidiana/operational-checklist.md`

**Phase 5 note**: the renewal-reminder cron itself is NOT in scope of Phase 5. Template 11 (`renewal-reminder.ts`) and the one-click cancel-token flow (`cancel-token.ts` + `/api/communitas/subscription/cancel?token=…`) are implemented; the cron that selects subscriptions with `current_period_end - 28d == today` and sends the reminder lands in Phase 8 polish. The token format is HMAC-signed and stateless, so the cron will work the day it is added.

**Phase 5 note (NORDSTERN)**: NORDSTERN tiers (€22.500 / €75.000 / €180.000+ per Spec FR-017) are a separate product line. Phase 5 does NOT create Stripe products for them. The webhook contains a code-comment placeholder for the NORDSTERN-share scholarship insert; when productised, add `STRIPE_PRICE_NORDSTERN_*` env vars and the `tier === 'nordstern_…'` branch.

**Checkpoint**: Zahlungsfluss funktioniert. Stipendien-Cron triggert jährlich. Wirtschaftsbasis (SC-001 ≥ 40 zahlende Mitglieder in 90 Tagen) ist messbar.

---

## Phase 6: User Story 4 — Die Zelle (Priority: P3)

**Goal**: Voll- und Inner-Circle-Mitglieder schreiben in einen privaten Schreibraum. Inhalte sind client-seitig verschlüsselt; Server sieht nur Chiffrat. Beim Austritt: Export + harte Löschung.

**Independent Test**: Mitglied loggt sich ein, setzt Zell-Passphrase, schreibt Eintrag, schließt Browser; auf einem zweiten Gerät erscheint der Eintrag als Chiffrat (Server-API liefert nur ciphertext_b64), nach Passphrase-Eingabe wird er lokal entschlüsselt. SQL-Query gegen `cell_entries` liefert nirgends Klartext.

### Implementation for User Story 4

- [ ] T084 [P] [US4] Implement client component `src/components/communitas/CellEditor.tsx` (`client:load`, React): textarea + save button + entry list, uses `client-crypto.ts` for AES-GCM, persists key in IndexedDB under origin `tobiasoberrauch.de`
- [ ] T085 [P] [US4] Implement client component `src/components/communitas/PassphraseSetup.tsx`: first-login flow that asks the member to set a Zell-Passphrase, derives AES key via Argon2id (memory=64MB, iter=3), stores wrapped key in IndexedDB, shows the consequence („Verlust = Verlust" Spec assumption)
- [ ] T086 [US4] Implement page `src/pages/communitas-mitglied/zelle.astro`: gate on tier ∈ {voll, inner_circle}; check IndexedDB for key; if absent → `<PassphraseSetup/>`; if present → `<CellEditor/>`; serve at server time without ever reading entry bodies
- [ ] T087 [US4] Implement endpoint `src/pages/api/communitas/cell/list.ts` (GET): return only metadata `[{ id, written_on, byte_length, updated_at }]` for the authenticated member
- [ ] T088 [US4] Implement endpoint `src/pages/api/communitas/cell/[id].ts` (GET, ownership-checked): return `{ id, ciphertext_b64, iv_b64, written_on }`; 403 if not owner
- [ ] T089 [US4] Implement endpoint `src/pages/api/communitas/cell/save.ts` (POST, auth): upsert `cell_entries`, validate `byte_length(ciphertext) ≤ 256 KB`, validate `iv` decodes to 12 bytes, do not store any other content metadata
- [ ] T090 [US4] Implement endpoint `src/pages/api/communitas/cell/[id]/delete.ts` (DELETE): remove row, return 204
- [ ] T091 [US4] Implement endpoint `src/pages/api/communitas/account/export.ts` (POST, auth): generate a ZIP archive of the member's cell entries (chiffrate + iv as JSON, NOT decrypted) + kreis-membership info, send via Resend attachment, do NOT delete data yet
- [ ] T092 [US4] Implement endpoint `src/pages/api/communitas/account/leave.ts` (POST, auth, requires prior export within last 30 days): set `members.left_on = current_date`, hard-delete cell_entries + kreis_messages where author is this member + sessions + magic_links via FK cascades; respond 200 with farewell text
- [ ] T093 [P] [US4] Write unit test `tests/communitas/unit/client-crypto.test.ts`: AES-GCM round-trip — encrypt with passphrase-derived key, decrypt, plaintext equals input; assert that the ciphertext does NOT contain the plaintext as substring
- [ ] T094 [P] [US4] Write E2E test `tests/communitas/e2e/cell-roundtrip.spec.ts`: log in as test member, set passphrase, write entry „Heute schwer.", reload page, decrypt with passphrase, assert entry visible; then SQL query against `cell_entries` confirms no plaintext „Heute schwer." present in ciphertext column

**Checkpoint**: Zelle ist server-blind. Austritt funktioniert mit vollständigem Export + Löschung.

---

## Phase 7: User Story 5 — Der Briefkreis (Priority: P3)

**Goal**: Drei bis fünf Mitglieder bilden einen Kreis. Pro Monat schreibt jeder einen Brief an die anderen; verschlüsselt mit gemeinsamem Symkey, server-blind wie die Zelle.

**Independent Test**: Tobias erstellt einen Kreis mit drei Test-Mitgliedern via Admin-Endpoint; jedes Mitglied empfängt Einführungsmail mit dem 6-Wort-Kreis-Code; jedes Mitglied gibt den Code beim ersten Kreis-Besuch in den Browser ein, der Symkey wird in IndexedDB gespeichert; Mitglied A schreibt einen Brief, B und C lesen ihn entschlüsselt.

### Implementation for User Story 5

- [ ] T095 [P] [US5] Implement admin endpoint `src/pages/api/communitas/admin/kreise.ts` (POST, role: companion): create kreis, generate 256-bit symmetric key encoded as 6-word BIP39 fragment, insert `kreise` + `kreis_members` rows, send introduction email to each member containing the 6-word code; respond `{ kreis_id, intro_question }`
- [ ] T096 [P] [US5] Implement client component `src/components/communitas/KreisCodeInput.tsx`: form to enter the 6-word code, derives symkey, stores in IndexedDB under `kreis-{id}` slot
- [ ] T097 [P] [US5] Implement client component `src/components/communitas/KreisLetter.tsx`: write + display kreis messages, uses kreis symkey from IndexedDB to encrypt outgoing and decrypt incoming
- [ ] T098 [US5] Implement page `src/pages/communitas-mitglied/kreis.astro`: list the kreis member belongs to, mount `<KreisCodeInput/>` if symkey missing, else `<KreisLetter/>`
- [ ] T099 [US5] Implement endpoint `src/pages/api/communitas/kreis/send.ts` (POST, auth, must be kreis member with `left_at IS NULL`): insert encrypted message row; respond 201
- [ ] T100 [US5] Implement endpoint `src/pages/api/communitas/kreis/[id]/messages.ts` (GET, auth, kreis-member): return messages with `since` query param for incremental fetch; chiffrate only
- [ ] T101 [P] [US5] Add email template renderer `src/lib/communitas/email-templates/kreis-introduction.astro`: send the 6-word code, the introductory question, and the first names of the other 2–4 members
- [ ] T102 [US5] Implement admin endpoint `src/pages/api/communitas/admin/kreise/[id]/add-member.ts` (POST): mark member added, but do NOT rotate the symkey (keep existing code valid) — document trade-off in code comment
- [ ] T103 [US5] Implement admin endpoint `src/pages/api/communitas/admin/kreise/[id]/remove-member.ts` (POST): set `kreis_members.left_at = now()`, optionally trigger key-rotation flow (manually opted in by remaining members)

**Checkpoint**: Briefkreise funktionieren end-to-end mit Server-Blind-Verschlüsselung.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Reisen, Schwellenritus, Vollmond-Briefe (Mehrfach-Stimmen), Observability, Dokumentation.

### Reisen (Spec FR-031)

- [ ] T104 [P] Implement page `src/pages/communitas-mitglied/reisen.astro`: list retreats from `GET /api/communitas/retreats`, show tier-specific price
- [ ] T105 [P] Implement endpoint `src/pages/api/communitas/retreats.ts` (GET): list retreats with `booked_count`, `price_for_member_cents` computed from caller's tier (Inner Circle = 0, NORDSTERN = 0, Voll = base + 1800–3200 €, Basis = full self-cost)
- [ ] T106 Implement endpoint `src/pages/api/communitas/retreats/[id]/book.ts` (POST): for Inner Circle/NORDSTERN insert booking directly; otherwise create Stripe Checkout Session with one-time charge, complete via existing webhook handler

### Vier-Stimmen + Vollmond-Briefe

- [ ] T107 [P] Implement page `src/pages/communitas-mitglied/admin/vollmond.astro`: editor for full_moon_letters; check that the last 12 brief authors have Tobias <50%, if violated show „Eine andere Stimme ist dran." block-warning (FR-029)
- [ ] T108 [P] Add email template renderer `src/lib/communitas/email-templates/full-moon.astro` (template 8)
- [ ] T109 Add scheduled task (manual trigger, not cron) `src/pages/api/communitas/admin/vollmond/[id]/send.ts`: render template 8 with the body_markdown, send to all Voll+InnerCircle members, include the renewal-reminder „Bleibe ich? Gehe ich?" footer

### Schwellenritus

- [ ] T110 Implement admin endpoint `src/pages/api/communitas/admin/members/[id]/schale.ts` (PATCH): set new `current_schale_key`, `in_threshold_until = current_date + transition_days`, write Begleiter transition letter to a separate transient table or send directly via email; ensure morning-anchor cron checks `in_threshold_until` and switches to reduced-spur content
- [ ] T111 Update `src/pages/api/communitas/cron/morning.ts`: when `in_threshold_until ≥ today`, send only a verse-only anchor (no question) — verify via existing unit test `schedule.test.ts` extended

### Anti-Personenkult Hardening

- [ ] T112 [P] Add `tests/communitas/unit/anti-personenkult.test.ts`: assert that there is no module `src/lib/communitas/quotes.ts` or `src/components/communitas/TobiasQuoteCard.*` in the repo; CI-checked guard
- [ ] T113 [P] Add `tests/communitas/unit/no-tracking.test.ts`: render all member-area Astro pages via build snapshot, assert HTML contains neither `Analytics` nor `OpenPanel` `<script>` tags; check public communitas pages have NO Meta/LinkedIn/Google Ads pixels

### Documentation

- [ ] T114 [P] Write `docs/communitas/operations.md`: runbook for Tobias and the three Begleiter — how to read incoming applications, how to accept/decline, how to create a Kreis, how to grant a scholarship, how to handle an acute crisis disclosure (privately, not via system)
- [ ] T115 [P] Write `docs/communitas/data-policy.md`: DSGVO statement (Verfahrensverzeichnis), data retention table per data-model.md §Data Retention & DSGVO, encryption boundaries, what the platform cannot see (cell entries, kreis letters)
- [ ] T116 [P] Extend `README.md` (project root) with a brief Communitas section pointing to `specs/001-communitas-cotidiana/` and `docs/communitas/`

### Quickstart Validation

- [ ] T117 Execute `specs/001-communitas-cotidiana/quickstart.md` end-to-end against a fresh Neon dev DB: install deps, set env vars, run migrations, run dev server, submit a test application, accept it, simulate a Stripe payment (Test mode), trigger morning cron manually — all steps must succeed
- [ ] T118 Deploy to Vercel Preview, smoke-test the application form on the preview URL, then promote to Production (`vercel --prod --yes`) only after operational checklist (T083) is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No deps; tasks T001–T008 parallelizable where marked.
- **Foundational (Phase 2)**: Depends on Setup; tasks T009–T025. BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2–US5.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independent of US1 (but US1 is recommended for context). Independent of US3–US5.
- **User Story 3 (Phase 5)**: Depends on Foundational. Independent of US2/US4/US5. Stripe webhook depends on US1's `members` row existing — but US1 already created the member row by acceptance, so US3 can start in parallel with US2.
- **User Story 4 (Phase 6)**: Depends on Foundational. Tier-gated on subscription status from US3, but the cell logic itself doesn't require US3 to be complete (passes through DB lookups).
- **User Story 5 (Phase 7)**: Depends on Foundational. Same tier-gating note.
- **Polish (Phase 8)**: Depends on at least US1 + US2 + US3 (retreats need payment, four-voice needs vollmond which is a cross-story concept).

### Within Each User Story

- Models (already created in Foundational migrations) before services.
- Services in `src/lib/communitas/` before endpoints in `src/pages/api/communitas/`.
- Endpoints before pages in `src/pages/communitas/` and `/communitas-mitglied/`.
- Email templates before the endpoints that use them.

### Parallel Opportunities

- All Phase 1 tasks marked [P]: T002, T003, T004, T005, T006, T007, T008 (7 tasks parallel)
- Phase 2: migrations T010, T011, T012, T013, T014 are parallel after T009 (which adds the `citext` extension and core tables). Crypto/schedule helpers (T017, T020, T021) and tests (T022) are parallel.
- US1: content files T026–T028 and component files T029–T031 (6 tasks parallel); email templates T039–T042 (4 parallel)
- US2: content pool T050, audio placeholders T052, magic-link page T054 parallel; email templates T057–T061 (5 parallel)
- US3: email templates T072–T074 (3 parallel); payment integration tasks T077, T078, T080–T082 (5 parallel after T071)
- US4: client components T084–T085 parallel; unit tests T093–T094 parallel
- US5: components T096–T097 parallel; email template T101 parallel
- Polish: T104, T105, T107, T108, T112, T113, T114, T115, T116 are mostly parallel

### Critical Path

The shortest sequence to MVP (User Story 1 only): T001 → T002 → T009 → T015 → T016 → T018 → T019 → T020 → T029 (parallelizable in chunks) → T032 → T038 → T043 → T044 → T049. ~14 sequential tasks for MVP.

---

## Parallel Example: User Story 1 (MVP)

```bash
# After T009 (init.sql) completes, content + components in parallel:
Task: "Write Manifest content src/lib/communitas/content/manifesto.md"
Task: "Write Glossar content src/lib/communitas/content/glossar.md"
Task: "Write Stille (boundary) content src/lib/communitas/content/stille.md"
Task: "Implement Manifest component src/components/communitas/Manifest.astro"
Task: "Implement Glossar component src/components/communitas/Glossar.astro"
Task: "Implement ApplicationForm component src/components/communitas/ApplicationForm.astro"

# Email templates can all be written in parallel:
Task: "Confirmation template src/lib/communitas/email-templates/confirmation.astro"
Task: "Acceptance template src/lib/communitas/email-templates/acceptance.astro"
Task: "Decline template src/lib/communitas/email-templates/decline.astro"
Task: "Return-letter template src/lib/communitas/email-templates/return-letter.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) — Empfohlen für ersten Deploy

1. **Phase 1 (Setup)**: T001–T008 (~1 Tag)
2. **Phase 2 (Foundational)**: T009–T025 (~3–4 Tage, inkl. DB-Setup auf Neon, Schlüsselgenerierung, Crypto-Helpers)
3. **Phase 3 (User Story 1)**: T026–T049 (~3–4 Tage)
4. **STOP, VALIDIEREN**: `quickstart.md` durchlaufen, eine echte Test-Bewerbung von außen einreichen, Tobias akzeptiert manuell, Brief-Rückzustellung im DB-Datum simuliert
5. **Deploy zu Vercel Production**: nach T083 (Stripe-DPA-Operational-Check ist hier noch nicht nötig, da MVP keine Zahlung umfasst — nur Aufnahmeformular)

→ MVP-Effekt: „Die ruhige Tür" steht. Tobias kann erste Bewerbungen sammeln, manuell antworten, das System trägt den Brief-Rück-Service. Das ist konsistent mit dem Spec-Plan G1 („vier Cotidianum-Briefe schreiben, kleine Aufnahme-Versammlung vorbereiten, schlichte Webpräsenz aufsetzen").

### Incremental Delivery

1. Phase 1 + 2 + 3 → Deploy MVP (Schwelle steht, Bewerbungen kommen)
2. Phase 4 (US2 Cotidianum) → Deploy: tägliche Anker laufen für die ersten 5 zahlenden Mitglieder
3. Phase 5 (US3 Zahlung) → Deploy: Stripe live; Mitglieder können zahlen, ohne dass Tobias manuell Rechnungen schreibt
4. Phase 6 (US4 Zelle) → Deploy: Schreibraum geht live, erst optional, dann Standard
5. Phase 7 (US5 Kreis) → Deploy: Briefkreise zugewiesen
6. Phase 8 (Polish) → Reisen + Vollmond-Briefe + Vier-Stimmen-Hardening + Docs

### Parallel Team Strategy (falls mehr als eine Person implementiert)

Nach Foundational (Phase 2):

- Entwickler A: US1 → US2 (Cotidianum-Pipeline)
- Entwickler B: US3 (Stripe-Integration parallel)
- Entwickler C: US4 + US5 (verschlüsselte Räume; gleichartige Browser-Crypto-Logik)

Polish-Phase ist die einzige, die mehrere Stories zusammenführt; sie wird sequenziell am Ende ausgeführt.

---

## Notes

- [P]-Tasks teilen sich keine Dateien und haben keine offene Abhängigkeit zu einer noch laufenden Task.
- [Story]-Label macht Tasks rückführbar auf die Spec-User-Story.
- Jede User Story ist independently completable und deploybar — der Strategiepapier-Anker („eine ruhige Tür" als erstes) wird durch MVP-Stopp nach Phase 3 honoriert.
- Bei Hook-Pre-Commits: `npm run test:unit` läuft, `npm run build` läuft. Beide müssen vor Push grün sein.
- Tests sind nicht überall vorgeschrieben — kritische Pfade (Cron-Idempotenz, Crypto-Roundtrip, Stipendien-Anonymität) sind getestet; Pages und Email-Templates per E2E-Smoke und Build-Snapshot.
- Stop at any checkpoint zur Story-Validierung; jedes Mal eine schlichte E-Mail an Tobias und einen Begleiter, dass die Story abgenommen werden kann.
- Avoid: Cross-Story-Abhängigkeiten, die Independence brechen; vague tasks ohne Pfad; Default-Tracker-Aktivierung im Member-Bereich.
