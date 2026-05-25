import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

/**
 * GET /api/communitas/admin/applications
 *
 * NOTE on Phase 3 limitation: `requireCompanion()` depends on session/magic-link
 * login which is implemented in Phase 4. Until then, this endpoint will 401 in
 * production. Documented in plan.md spec-ambiguity #1.
 *
 * Returns metadata only — never the encrypted letter content.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    await requireCompanion(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(
        JSON.stringify({ ok: false, code: err.status === 403 ? 'forbidden' : 'unauthorized' }),
        { status: err.status, headers: { 'content-type': 'application/json' } },
      );
    }
    throw err;
  }

  const rows = await sql<
    {
      id: number;
      applicant_name: string;
      applicant_email: string;
      question_text: string;
      letter_to_self_present: boolean;
      desired_tier: string;
      status: string;
      received_at: Date;
      ip_country: string | null;
    }[]
  >`
    SELECT
      id,
      applicant_name,
      applicant_email,
      question_text,
      (letter_to_self IS NOT NULL) AS letter_to_self_present,
      desired_tier,
      status,
      received_at,
      ip_country
    FROM applications
    ORDER BY received_at DESC
    LIMIT 100
  `;

  return new Response(JSON.stringify({ applications: rows }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
