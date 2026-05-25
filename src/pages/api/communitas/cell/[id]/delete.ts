/**
 * DELETE /api/communitas/cell/:id/delete
 *
 * Phase 6 / US4 / T090.
 *
 * Hard delete. No tombstone, no archive. The member chose to remove the
 * entry — we respect that. The ciphertext was unreadable to us anyway.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../../lib/communitas/auth';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const session = await requireMember(request);
    const idRaw = params.id;
    const id = idRaw ? Number(idRaw) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      return new Response(JSON.stringify({ ok: false, code: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    const rows = await sql<{ id: number }[]>`
      DELETE FROM cell_entries
      WHERE id = ${id} AND member_id = ${session.memberId}
      RETURNING id
    `;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, code: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[cell/delete] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
