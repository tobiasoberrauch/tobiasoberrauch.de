/**
 * GET /api/communitas/kreis/:id — Phase 7 / US5.
 *
 * Returns the kreis metadata visible to its members: name, introductory
 * question, member count, the caller's joined_at. NO ciphertext, no other
 * member email addresses.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../../lib/communitas/auth';

export const prerender = false;

interface KreisRow {
  id: number;
  name: string;
  introductory_question: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const session = await requireMember(request);
    const kreisId = Number(params.id);
    if (!Number.isFinite(kreisId) || kreisId <= 0) {
      return json(404, { ok: false, code: 'not_found' });
    }

    const mem = await sql<{ joined_at: Date | string; left_at: Date | string | null }[]>`
      SELECT joined_at, left_at FROM kreis_members
      WHERE kreis_id = ${kreisId} AND member_id = ${session.memberId}
      LIMIT 1
    `;
    if (mem.length === 0 || mem[0].left_at != null) {
      return json(403, { ok: false, code: 'not_a_kreis_member' });
    }

    const rows = await sql<KreisRow[]>`
      SELECT id, name, introductory_question FROM kreise
      WHERE id = ${kreisId} AND archived_at IS NULL LIMIT 1
    `;
    if (rows.length === 0) {
      return json(404, { ok: false, code: 'not_found' });
    }

    const count = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM kreis_members
      WHERE kreis_id = ${kreisId} AND left_at IS NULL
    `;

    return json(200, {
      id: Number(rows[0].id),
      name: rows[0].name,
      introductory_question: rows[0].introductory_question,
      member_count: Number(count[0]?.c ?? 0),
      joined_at: new Date(mem[0].joined_at).toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[kreis/index] error', (err as Error).message);
    return json(500, { ok: false });
  }
};
