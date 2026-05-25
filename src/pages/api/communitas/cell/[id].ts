/**
 * GET /api/communitas/cell/:id
 *
 * Phase 6 / US4 / T088.
 *
 * Returns ciphertext + iv for a single entry. The browser decrypts.
 * The server has no key and never decrypts.
 *
 * Membership check is strict: a member can only fetch their own entries.
 * On either missing-id OR member-mismatch we return 404 — we don't leak
 * existence by distinguishing the two cases.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

interface EntryRow {
  id: number;
  ciphertext: Buffer;
  iv: Buffer;
  written_on: Date | string;
}

export const GET: APIRoute = async ({ request, params }) => {
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
    const rows = await sql<EntryRow[]>`
      SELECT id, ciphertext, iv, written_on
      FROM cell_entries
      WHERE id = ${id} AND member_id = ${session.memberId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, code: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    const row = rows[0];
    const ciphertextBuf = Buffer.isBuffer(row.ciphertext)
      ? row.ciphertext
      : Buffer.from(row.ciphertext as unknown as Uint8Array);
    const ivBuf = Buffer.isBuffer(row.iv)
      ? row.iv
      : Buffer.from(row.iv as unknown as Uint8Array);
    const writtenOn =
      typeof row.written_on === 'string'
        ? row.written_on
        : new Date(row.written_on).toISOString().slice(0, 10);
    return new Response(
      JSON.stringify({
        id: Number(row.id),
        ciphertext_b64: ciphertextBuf.toString('base64'),
        iv_b64: ivBuf.toString('base64'),
        written_on: writtenOn,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[cell/get] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
