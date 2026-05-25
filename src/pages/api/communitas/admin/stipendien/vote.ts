/**
 * POST /api/communitas/admin/stipendien/vote
 *
 * Phase 8 — companion voting on scholarship applications.
 *
 * Companion-only. Body: { application_id: number, vote: 'ja'|'nein'|'enthalten' }.
 *
 * Inserts/updates a row in `scholarship_votes`. Once three „ja" votes have
 * accumulated for an application, this endpoint AUTO-CREATES a grant
 * (mirroring the existing /api/communitas/admin/scholarships/grant logic)
 * and marks the application `decision='granted'`.
 *
 * Anonymity: the resulting `scholarship_grants` row carries no link to
 * pool contributions — invariant from research.md §10 holds.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../../lib/communitas/auth';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface VoteBody {
  application_id: number;
  vote: 'ja' | 'nein' | 'enthalten';
}

function validate(raw: unknown): VoteBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = Number(r.application_id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const vote = r.vote;
  if (vote !== 'ja' && vote !== 'nein' && vote !== 'enthalten') return null;
  return { application_id: id, vote };
}

export const POST: APIRoute = async ({ request }) => {
  let callerId: number;
  try {
    const s = await requireCompanion(request);
    callerId = s.memberId;
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, {
        ok: false,
        code: err.status === 401 ? 'unauthorized' : 'forbidden',
      });
    }
    return json(401, { ok: false, code: 'unauthorized' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'body' });
  }
  const v = validate(body);
  if (!v) return json(400, { ok: false, code: 'validation_error' });

  const appRows = await sql<
    {
      id: number;
      application_year: number;
      applicant_member_id: number | null;
      decision: string | null;
    }[]
  >`
    SELECT id, application_year, applicant_member_id, decision
    FROM scholarship_applications WHERE id = ${v.application_id} LIMIT 1
  `;
  if (appRows.length === 0) {
    return json(404, { ok: false, code: 'not_found' });
  }
  const app = appRows[0];
  if (app.decision) {
    return json(400, { ok: false, code: 'validation_error', detail: 'already_decided' });
  }

  // Upsert the vote — UNIQUE(application_id, voter_member_id) prevents dupes.
  await sql`
    INSERT INTO scholarship_votes (application_id, voter_member_id, vote)
    VALUES (${v.application_id}, ${callerId}, ${v.vote})
    ON CONFLICT (application_id, voter_member_id) DO UPDATE
      SET vote = EXCLUDED.vote, voted_at = now()
  `;

  // Count „ja" votes.
  const counts = await sql<{ ja_count: number }[]>`
    SELECT COUNT(*)::int AS ja_count FROM scholarship_votes
    WHERE application_id = ${v.application_id} AND vote = 'ja'
  `;
  const jaCount = Number(counts[0].ja_count);

  // Auto-grant on three „ja"s, but only if the applicant is a known member.
  // Anonymous external applicants must first be converted to a member row
  // (out of band) — we don't auto-create accounts.
  if (jaCount >= 3 && app.applicant_member_id) {
    // Refuse if recipient already has a paid subscription in this year.
    const conflict = await sql<{ id: number }[]>`
      SELECT id FROM subscriptions
      WHERE member_id = ${app.applicant_member_id}
        AND status IN ('active', 'past_due', 'scholarship', 'paused')
        AND EXTRACT(year FROM current_period_end)::int = ${app.application_year}
      LIMIT 1
    `;
    if (conflict.length === 0) {
      const grantRows = await sql<{ id: number }[]>`
        INSERT INTO scholarship_grants (
          grant_year, recipient_member_id, approved_by_three, notes
        ) VALUES (
          ${app.application_year}, ${app.applicant_member_id}, true,
          'three companion votes via /admin/stipendien'
        )
        RETURNING id
      `;
      const grantId = Number(grantRows[0].id);
      const ps = new Date(Date.UTC(app.application_year, 0, 1)).toISOString().slice(0, 10);
      const pe = new Date(Date.UTC(app.application_year, 11, 31)).toISOString().slice(0, 10);
      await sql`
        INSERT INTO subscriptions (
          member_id, tier, stripe_subscription_id, stripe_customer_id,
          yearly_amount_cents, current_period_start, current_period_end,
          status, scholarship_grant_id
        ) VALUES (
          ${app.applicant_member_id}, 'voll', NULL, NULL,
          360000, ${ps}, ${pe}, 'scholarship', ${grantId}
        )
      `;
      await sql`
        UPDATE scholarship_applications
        SET decided_at = now(), decision = 'granted'
        WHERE id = ${v.application_id}
      `;
      return json(200, {
        ok: true,
        ja_count: jaCount,
        granted: true,
        grant_id: grantId,
      });
    }
  }

  return json(200, { ok: true, ja_count: jaCount, granted: false });
};
