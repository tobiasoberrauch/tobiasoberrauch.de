/**
 * POST /api/communitas/cell/reset
 *
 * Phase 6 / US4 / T091b.
 *
 * Destructive passphrase reset. The user accepts that all existing cell
 * entries become permanently unreadable (the server never had the key)
 * and asks us to remove the ciphertext rows + clear the salt so the next
 * passphrase setup re-stores a fresh salt.
 *
 * Body must contain `confirmation: 'Ich verstehe'` exactly. This guards
 * against accidental fetch calls in dev tools.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await requireMember(request);
    let body: { confirmation?: string };
    try {
      body = (await request.json()) as { confirmation?: string };
    } catch {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_json' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    if (body.confirmation !== 'Ich verstehe') {
      return new Response(
        JSON.stringify({ ok: false, code: 'confirmation_required' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    const deleted = await sql<{ id: number }[]>`
      DELETE FROM cell_entries WHERE member_id = ${session.memberId} RETURNING id
    `;
    await sql`
      UPDATE members SET cell_salt = NULL WHERE id = ${session.memberId}
    `;
    return new Response(
      JSON.stringify({ ok: true, deleted_count: deleted.length }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[cell/reset] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
