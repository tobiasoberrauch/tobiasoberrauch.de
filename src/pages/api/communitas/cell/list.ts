/**
 * GET /api/communitas/cell/list
 *
 * Phase 6 / US4 / T087.
 *
 * Returns the metadata of the authenticated member's cell entries —
 * NEVER the ciphertext. The list view in the UI uses written_on and
 * byte_length to render rows; the body is fetched only on open.
 *
 * Server-blind invariant: this endpoint does not decrypt anything. The
 * server has no key. By architecture.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

interface EntryMeta {
  id: number;
  written_on: string;
  byte_length: number;
  updated_at: Date;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await requireMember(request);
    // No `ciphertext` column in the SELECT — never list ciphertext.
    const rows = await sql<EntryMeta[]>`
      SELECT id, written_on, byte_length, updated_at
      FROM cell_entries
      WHERE member_id = ${session.memberId}
      ORDER BY written_on DESC, id DESC
      LIMIT 365
    `;
    return new Response(
      JSON.stringify({
        entries: rows.map((r) => ({
          id: Number(r.id),
          written_on:
            typeof r.written_on === 'string'
              ? r.written_on
              : new Date(r.written_on as unknown as Date)
                  .toISOString()
                  .slice(0, 10),
          byte_length: Number(r.byte_length),
          updated_at: new Date(r.updated_at).toISOString(),
        })),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[cell/list] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
