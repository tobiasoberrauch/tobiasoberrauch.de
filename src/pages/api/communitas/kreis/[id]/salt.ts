/**
 * GET /api/communitas/kreis/:id/salt — Phase 7 / US5.
 *
 * Returns the non-secret Argon2id salt for this kreis so members can
 * derive the symkey from the 6-word code they got via mail.
 *
 * The salt is NOT a secret. We still gate it behind kreis-membership so
 * we don't leak the existence of a kreis to unrelated members.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../../lib/communitas/auth';

export const prerender = false;

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

    const mem = await sql<{ left_at: Date | string | null }[]>`
      SELECT left_at FROM kreis_members
      WHERE kreis_id = ${kreisId} AND member_id = ${session.memberId}
      LIMIT 1
    `;
    if (mem.length === 0 || mem[0].left_at != null) {
      return json(403, { ok: false, code: 'not_a_kreis_member' });
    }

    const rows = await sql<{ symkey_salt: Buffer | null }[]>`
      SELECT symkey_salt FROM kreise WHERE id = ${kreisId} LIMIT 1
    `;
    if (rows.length === 0) {
      return json(404, { ok: false, code: 'not_found' });
    }
    const salt = rows[0].symkey_salt;
    if (!salt) {
      return json(409, { ok: false, code: 'salt_missing' });
    }
    const saltBuf = Buffer.isBuffer(salt)
      ? salt
      : Buffer.from(salt as unknown as Uint8Array);
    return json(200, { salt_b64: saltBuf.toString('base64') });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[kreis/salt] error', (err as Error).message);
    return json(500, { ok: false });
  }
};
