/**
 * POST /api/communitas/cell/save
 *
 * Phase 6 / US4 / T089.
 *
 * Body: { id?, written_on: ISO date, ciphertext_b64, iv_b64 }
 *
 * Server-blind: we accept opaque ciphertext bytes, validate sizes and shape,
 * and store them. We do not parse, log, or echo the ciphertext.
 *
 * Constraints (Spec FR-023):
 *   - iv must be exactly 12 bytes (AES-GCM nonce)
 *   - ciphertext must be ≤ 256 KB
 *   - written_on must parse and not be in the future (in UTC; small client
 *     skew is tolerated by allowing up to +1 day).
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

const MAX_CIPHERTEXT_BYTES = 256 * 1024;
const IV_LENGTH = 12;

interface SaveBody {
  id?: number;
  written_on?: string;
  ciphertext_b64?: string;
  iv_b64?: string;
}

function jsonError(status: number, code: string, detail?: string): Response {
  return new Response(JSON.stringify({ ok: false, code, detail }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await requireMember(request);
    let body: SaveBody;
    try {
      body = (await request.json()) as SaveBody;
    } catch {
      return jsonError(400, 'invalid_json');
    }

    if (!body.ciphertext_b64 || !body.iv_b64 || !body.written_on) {
      return jsonError(400, 'missing_fields');
    }

    // Validate written_on
    const writtenOn = body.written_on;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(writtenOn)) {
      return jsonError(400, 'invalid_date_format');
    }
    const writtenOnDate = new Date(writtenOn + 'T00:00:00Z');
    if (Number.isNaN(writtenOnDate.getTime())) {
      return jsonError(400, 'invalid_date');
    }
    // Allow up to +1 day for timezone skew, but not arbitrary future.
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (writtenOnDate.getTime() > tomorrow.getTime()) {
      return jsonError(400, 'future_date');
    }

    // Decode iv
    let iv: Buffer;
    try {
      iv = Buffer.from(body.iv_b64, 'base64');
    } catch {
      return jsonError(400, 'invalid_iv_b64');
    }
    if (iv.length !== IV_LENGTH) {
      return jsonError(400, 'invalid_iv_length');
    }

    // Decode ciphertext
    let ciphertext: Buffer;
    try {
      ciphertext = Buffer.from(body.ciphertext_b64, 'base64');
    } catch {
      return jsonError(400, 'invalid_ciphertext_b64');
    }
    if (ciphertext.length === 0) {
      return jsonError(400, 'empty_ciphertext');
    }
    if (ciphertext.length > MAX_CIPHERTEXT_BYTES) {
      return jsonError(413, 'ciphertext_too_large');
    }

    const byteLength = ciphertext.length;

    if (typeof body.id === 'number' && body.id > 0) {
      // Update — verify ownership in the WHERE clause.
      const updated = await sql<{ id: number; updated_at: Date }[]>`
        UPDATE cell_entries
        SET ciphertext = ${ciphertext},
            iv = ${iv},
            written_on = ${writtenOn}::date,
            byte_length = ${byteLength},
            updated_at = now()
        WHERE id = ${body.id} AND member_id = ${session.memberId}
        RETURNING id, updated_at
      `;
      if (updated.length === 0) {
        return jsonError(404, 'not_found');
      }
      return new Response(
        JSON.stringify({
          id: Number(updated[0].id),
          updated_at: new Date(updated[0].updated_at).toISOString(),
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    // Insert
    const inserted = await sql<{ id: number; updated_at: Date }[]>`
      INSERT INTO cell_entries (member_id, ciphertext, iv, written_on, byte_length)
      VALUES (${session.memberId}, ${ciphertext}, ${iv}, ${writtenOn}::date, ${byteLength})
      RETURNING id, updated_at
    `;
    return new Response(
      JSON.stringify({
        id: Number(inserted[0].id),
        updated_at: new Date(inserted[0].updated_at).toISOString(),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[cell/save] error', (err as Error).message);
    return jsonError(500, 'internal_error');
  }
};
