# Operational Checklist — Communitas Cotidiana

Manual steps that the project owner must perform out-of-band. Code alone
cannot complete them.

## Phase 2 (Foundational)

### Neon database (T023)

`npm run communitas:migrate` was NOT executed against a real database during
the implementation of Phase 2 — no credentials were available to the agent.

**Action for project owner**:

1. Create a Neon project named `tobiasoberrauch-communitas` in region
   `eu-central-1` (Frankfurt). Do NOT use a US region (DSGVO).
2. Copy the connection string (`postgresql://...neon.tech/neondb?sslmode=require`).
3. Locally: write it to `.env.local` as `COMMUNITAS_DATABASE_URL`.
4. Run:

   ```bash
   COMMUNITAS_DATABASE_URL=<url> npm run communitas:migrate
   ```

5. Verify:

   ```sql
   SELECT count(*) FROM schales;   -- expect 7
   SELECT count(*) FROM members;   -- expect 0
   ```

6. Optionally seed dev data:

   ```bash
   COMMUNITAS_DATABASE_URL=<url> npm run communitas:seed
   ```

## Phase 5 (Stripe — Setup für US3)

### Stripe account & DPA (T083)

1. https://dashboard.stripe.com → Account anlegen, Geschäftssitz Deutschland.
   Business address must be a real German address (DSGVO Verantwortlicher).
2. Settings → Account → Documents → sign the German DPA (Auftrags-
   verarbeitungsvertrag). Save the signed PDF for the Verfahrensverzeichnis.
3. Settings → Payment Methods → SEPA Direct Debit → Activate.
   (No Apple Pay, no Google Pay, no Buy-Now-Pay-Later — those load
   client-side telemetry that Spec FR-018 forbids.)

### Products & Price IDs

4. Create three recurring products in Test mode (`Yearly`):
   - Communitas Basis — €960,00 → copy Price ID → Vercel env
     `STRIPE_PRICE_BASIS`.
   - Communitas Voll — €3.600,00 → `STRIPE_PRICE_VOLL`.
   - Communitas Inner Circle — €18.000,00 → `STRIPE_PRICE_INNER_CIRCLE`.

   NORDSTERN (€22.500 / €75.000 / €180.000+) is a separate product line per
   Spec FR-017. It is **not** in scope for Phase 5; once productised, add
   `STRIPE_PRICE_NORDSTERN_*` env vars and extend `stripe.ts` + the webhook
   path that inserts the 5 % scholarship share with `source='nordstern_share'`.

### Webhook

5. Add webhook endpoint
   `https://tobiasoberrauch.de/api/communitas/stripe/webhook` with events:
   - `checkout.session.completed`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded` (recovery from past_due → active)
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

   Copy the signing secret → Vercel env `STRIPE_WEBHOOK_SECRET`.

### Vercel env summary (Phase 5)

| Variable | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (server-side, sk_live_…) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint signing secret |
| `STRIPE_PRICE_BASIS` | from step 4 above |
| `STRIPE_PRICE_VOLL` | from step 4 above |
| `STRIPE_PRICE_INNER_CIRCLE` | from step 4 above |
| `SITE_URL` | `https://tobiasoberrauch.de` (production) |

### Migration 007

6. Apply migration `007_payment_failure_tracking.sql` (adds
   `subscriptions.payment_failure_notified_at`) via:

   ```bash
   COMMUNITAS_DATABASE_URL=<url> npm run communitas:migrate
   ```

   The runner is idempotent — re-running on an already-migrated DB is safe.

### Scholarship cron

7. The annual scholarship cron is already declared in `vercel.json`:
   `{ "path": "/api/communitas/cron/scholarship-cycle", "schedule": "0 12 1 11 *" }`.
   No manual action needed beyond the env vars above. The handler is
   defensive: it no-ops if the calendar day is not November 1 (Vercel
   timezone drift guard).

### Known Phase 5 limitations

- **No renewal-reminder cron**. Template 11 is implemented; a cron that
  selects subscriptions with `current_period_end - 28d == today` and
  sends it is deferred to Phase 8 polish. The one-click cancel token
  flow IS implemented (`cancel-token.ts` + `/api/communitas/subscription/cancel?token=…`),
  so when the cron lands it can mint working URLs immediately.
- **NORDSTERN price IDs are not configured** — see operational note above.
- **The Begleiter decision UI for scholarships is a stub** — Phase 5 ships
  the cron, the email (template 14), and the grant endpoint. Begleiter
  currently issue grants via direct `POST /api/communitas/admin/scholarships/grant`
  (or curl). Phase 8 will polish the decision page at
  `/communitas-mitglied/admin/stipendien/`.
- **NO Apple Pay / Google Pay / BNPL / Crypto.** Enforced by
  `payment_method_types: ['sepa_debit', 'card']` in `stripe.ts`.
- **DSGVO retention**: cancelled subscription rows are NOT auto-deleted —
  we keep them for accounting and revenue history. The hard-delete on
  Account-Schließen is a separate Phase 6+ flow.

## Phase 3 (User Story 1)

### Tracker-Verifikation (T049)

After `npm run build`, the public `/communitas/*` pages were inspected for
known marketing trackers. Result:

```bash
grep -rE -i 'connect\.facebook|linkedin\.com/insight|googletagmanager|\
google-analytics|fbq|fbevents|gtag|hotjar|mixpanel' \
  dist/client/communitas/
# → 0 script/embed matches.
# (Only match is the German definition of "Tracker" in the glossar — content,
#  not a script.)
```

Vercel Analytics (`va.vercel-scripts`) IS present on public `/communitas/*`
pages as expected per FR-008 (public pages keep aggregate analytics; member
pages do not). `Base.astro` enforces this via `isMemberArea` check.

### Phase-3 known limitations

- Admin endpoints (`/api/communitas/admin/applications*`) and the admin UI
  (`/communitas-mitglied/admin/bewerbungen`) call `requireCompanion()`, which
  depends on magic-link login. Magic-link login is **Phase 4 work**, so these
  surfaces will 401 in production until Phase 4 ships. They are wired
  end-to-end except for the auth-source.
- The acceptance email (template 2) communicates "Der Zahlungslink folgt in
  den nächsten Tagen." rather than a working Stripe Checkout URL. Stripe is
  **Phase 5 work**; the template accepts a `checkout_url` prop that Phase 5
  will populate.
- The E2E spec `tests/communitas/e2e/application-flow.spec.ts` for the
  full submit-flow is marked `.skip` because the API endpoint requires
  COMMUNITAS_DATABASE_URL. The non-DB part (tracker-absence check) runs.

## Resend domain (Phase 2/3)

1. Verify `tobiasoberrauch.de` in Resend (SPF, DKIM, DMARC DNS records).
2. Create a separate audience "Communitas — Mitglieder" → record its UUID as
   `RESEND_COMMUNITAS_AUDIENCE_ID` (kept distinct from the public newsletter
   audience).

## Phase 7 (User Story 5 — Der Briefkreis)

### Migration 010

Apply via:

```bash
COMMUNITAS_DATABASE_URL=<url> npm run communitas:migrate
```

Adds `kreise.symkey_salt BYTEA`. Idempotent — re-running on an already-
migrated DB is safe.

### Workflow — creating a kreis (Tobias or a Begleiter)

1. `POST /api/communitas/admin/kreise` with `{ name, introductory_question,
   member_ids: [3..5 voll/inner_circle members] }`.
2. The server generates a 16-byte Argon2id salt (persisted) plus a 6-word
   code (NEVER persisted — only embedded in outgoing mails).
3. Each member receives template 8 ("kreis-introduction") individually:
   - the kreis name
   - the introductory question
   - the OTHER members' first names (no emails are shared)
   - the 6-word code, displayed in a monospaced block
   - a link to `/communitas-mitglied/kreis/<id>`
4. Each member opens the link, types the 6 words, and the browser derives
   the AES-256 key via Argon2id and stores it in IndexedDB under slot
   `kreis-<id>`.
5. Kreis goes live. Members write letters; polling refreshes every 5
   minutes. No real-time, no reactions, no read receipts.

### Adding a member later

`POST /api/communitas/admin/kreise/<id>/add-member` with `{ member_id }`.

The new member is inserted with `joined_at = now()`. The `/messages`
endpoint clamps the `since` filter to the caller's `joined_at`, so the
new member only sees letters written from now forward
(read-forward-only).

They receive a quieter intro mail that asks them to obtain the code from
the existing members. The server does NOT have the code; if no existing
member can pass it on, the admin must call `/rotate-code` (see below) to
mint a fresh code for everyone — at the cost of making past letters
unreadable.

### Removing a member

`POST /api/communitas/admin/kreise/<id>/remove-member` with `{ member_id }`.

Soft-removes via `kreis_members.left_at = now()`. The code is NOT
rotated automatically. Remaining members receive a quiet notice. If the
remaining members want to lock the departed member out of future
letters, call `/rotate-code`.

### Rotating the code

`POST /api/communitas/admin/kreise/<id>/rotate-code`. Generates a new
salt + a new 6-word code, emails everyone, and effectively restarts the
kreis. Past ciphertext becomes unreadable — the UI displays „Dieser
Brief konnte nicht entschlüsselt werden." for those rows.

### Resend templates

Template 8 (`kreis-introduction.ts`) is sent on kreis create and on
`rotate-code`. No additional Resend configuration is required beyond the
Phase-2/3 domain setup.

### Phase-7 known limitations

- The admin surface (UI) for kreis management is NOT in scope here.
  Tobias and the Begleiter operate the endpoints via direct API calls
  (curl) for now. A polished admin page is Phase 8 work.
- The 6-word code is 54 raw bits of entropy. Argon2id (64 MiB, 3 iter,
  4-way) hardens it; the server-blind model means an offline brute-force
  attack would require either a server compromise or a member's
  IndexedDB. Documented in `wordlist-entropy.test.ts`.
- Loss-of-code recovery exists only via `rotate-code`, which discards
  all prior ciphertext. This is intentional: the alternative — server
  recovery of the key — would break server-blindness.
