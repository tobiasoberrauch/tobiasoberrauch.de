/**
 * GET /api/communitas/cron/scholarship-cycle
 *
 * Phase 5 / US3 / T078. Annual on Nov 1, 12:00 UTC.
 *
 * Computes the available scholarship pool for the current year and
 * notifies the Begleiter (role='companion'). Vergabe selbst erfolgt
 * manuell via POST /api/communitas/admin/scholarships/grant.
 *
 * Anonymity (research.md §10): we work with sums only — never with
 * individual contributions linked to recipients.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { sendBatched, type MailParams } from '../../../../lib/communitas/mailer';
import scholarshipTrigger from '../../../../lib/communitas/email-templates/scholarship-trigger';

export const prerender = false;

const VOLL_CENTS = 360000;
const MAX_GRANTS_PER_YEAR = 12;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function formatEuros(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

export const GET: APIRoute = async ({ request }) => {
  const expected = process.env.CRON_SECRET;
  const got = request.headers.get('authorization') ?? '';
  if (!expected || got !== `Bearer ${expected}`) {
    return json(401, { ok: false, code: 'unauthorized' });
  }

  // Defensive: this cron is scheduled for Nov 1. If Vercel drifts to
  // Oct 31 / Nov 2 in some timezone, we still want to run on Nov 1 only.
  const now = new Date();
  if (now.getUTCMonth() !== 10 /* November */ || now.getUTCDate() !== 1) {
    return json(200, { ok: true, skipped: true, reason: 'not_nov_1' });
  }

  const year = now.getUTCFullYear();

  let poolCents = 0;
  let grantedCount = 0;
  let companions: { id: number; email: string; display_name: string }[] = [];

  try {
    const poolRows = await sql<{ sum: string | null }[]>`
      SELECT SUM(amount_cents)::text AS sum
      FROM scholarship_pool_contributions
      WHERE contribution_year = ${year}
    `;
    poolCents = Number(poolRows[0]?.sum ?? 0);

    const grantRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM scholarship_grants
      WHERE grant_year = ${year}
    `;
    grantedCount = Number(grantRows[0]?.count ?? 0);

    companions = await sql<
      { id: number; email: string; display_name: string }[]
    >`
      SELECT id, email, display_name
      FROM members
      WHERE role = 'companion'
        AND left_on IS NULL
    `;
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'upstream_error',
      detail: (err as Error).message,
    });
  }

  const availableCents = Math.max(0, poolCents - grantedCount * VOLL_CENTS);
  const nGrants = Math.min(
    MAX_GRANTS_PER_YEAR,
    Math.floor(availableCents / VOLL_CENTS),
  );

  // Even with 0 grants possible, we notify so the Begleiter see the year's
  // status. The message wording naturally degrades when nGrants is 0.
  const siteUrl = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';
  const decisionUrl = `${siteUrl}/communitas-mitglied/admin/stipendien/`;
  const poolEur = formatEuros(availableCents);

  const messages: MailParams[] = companions.map((c) => ({
    to: c.email,
    subject: 'Zwölf stille Stipendien — November-Vergabe.',
    html: scholarshipTrigger({
      pool_amount_eur: poolEur,
      n_grants: nGrants,
      anonymized_letters_pdf_url: '',
      decision_url: decisionUrl,
    }),
  }));

  const results = await sendBatched(messages);
  let notified = 0;
  for (const r of results) {
    if (r.ok || r.code === 'not_configured') notified++;
  }

  return json(200, {
    ok: true,
    pool_amount_cents: availableCents,
    n_grants: nGrants,
    companions_notified: notified,
  });
};
