/**
 * GET|POST /api/communitas/cell/salt
 *
 * Phase 6 / US4 / T085b.
 *
 * The cell salt is a public input to Argon2id. It is NOT a secret — but it
 * must be (a) stable for the lifetime of the member's passphrase and
 * (b) distinct per member so two members with identical passphrases derive
 * different keys.
 *
 * Flow:
 *   - First-time setup: client generates 16 random bytes, derives key,
 *     stores salt locally in IndexedDB, then POSTs the salt here.
 *   - New device with same passphrase: client GETs the salt, re-derives
 *     the same key, stores locally for future sessions.
 *   - Passphrase reset: goes through /api/communitas/cell/reset which
 *     nulls the salt; afterwards the user runs first-time setup again.
 *
 * Setting twice (POST with a salt already present) is rejected — the user
 * must go through /reset to discard old salt + old ciphertext together.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

const SALT_BYTES = 16;

export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await requireMember(request);
    const rows = await sql<{ cell_salt: Buffer | null }[]>`
      SELECT cell_salt FROM members WHERE id = ${session.memberId} LIMIT 1
    `;
    const salt = rows[0]?.cell_salt;
    return new Response(
      JSON.stringify({
        salt_b64: salt
          ? (Buffer.isBuffer(salt)
              ? salt
              : Buffer.from(salt as unknown as Uint8Array)
            ).toString('base64')
          : null,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[cell/salt GET] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await requireMember(request);
    let body: { salt_b64?: string };
    try {
      body = (await request.json()) as { salt_b64?: string };
    } catch {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_json' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    if (!body.salt_b64) {
      return new Response(
        JSON.stringify({ ok: false, code: 'missing_salt' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    let salt: Buffer;
    try {
      salt = Buffer.from(body.salt_b64, 'base64');
    } catch {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_salt_b64' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    if (salt.length !== SALT_BYTES) {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_salt_length' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    // Refuse to overwrite an existing salt — go through /reset instead.
    const existing = await sql<{ cell_salt: Buffer | null }[]>`
      SELECT cell_salt FROM members WHERE id = ${session.memberId} LIMIT 1
    `;
    if (existing[0]?.cell_salt) {
      return new Response(
        JSON.stringify({ ok: false, code: 'salt_already_set' }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      );
    }
    await sql`
      UPDATE members SET cell_salt = ${salt} WHERE id = ${session.memberId}
    `;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[cell/salt POST] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
