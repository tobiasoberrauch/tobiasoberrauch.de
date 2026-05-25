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

## Phase 5 (Stripe — placeholder, executed in US3)

### Stripe DPA + SEPA (T083)

1. https://dashboard.stripe.com → Account anlegen, Geschäftssitz Deutschland.
2. Settings → Legal → Sign the German DPA.
3. Settings → Payment Methods → SEPA Direct Debit → Activate.
4. Create three recurring products in Test mode:
   - Communitas Basis — jährlich €960,00 → price ID → `STRIPE_PRICE_BASIS`
   - Communitas Voll — jährlich €3.600,00 → `STRIPE_PRICE_VOLL`
   - Communitas Inner Circle — jährlich €18.000,00 → `STRIPE_PRICE_INNER_CIRCLE`
5. Add webhook endpoint
   `https://tobiasoberrauch.de/api/communitas/stripe/webhook` with events:
   `checkout.session.completed`, `invoice.payment_failed`,
   `customer.subscription.deleted`, `customer.subscription.updated`.
   Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

## Resend domain (Phase 2/3)

1. Verify `tobiasoberrauch.de` in Resend (SPF, DKIM, DMARC DNS records).
2. Create a separate audience "Communitas — Mitglieder" → record its UUID as
   `RESEND_COMMUNITAS_AUDIENCE_ID` (kept distinct from the public newsletter
   audience).
