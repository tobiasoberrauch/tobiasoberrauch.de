/**
 * POST /api/communitas/kreis/send — Phase 7 / US5 / T099.
 *
 * Server-blind: we accept opaque ciphertext bytes, validate sizes and
 * shape, and store. We do not parse, log, or echo the ciphertext.
 *
 * Constraints (Spec FR-024):
 *   - iv must be exactly 12 bytes (AES-GCM nonce)
 *   - ciphertext must be ≤ 64 KB
 *   - caller must be an active member of the kreis (kreis_members.left_at
 *     IS NULL)
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';
import {
  canSendToKreis,
  type KreisMembershipRow,
} from '../../../../lib/communitas/kreis-membership';

export const prerender = false;

const MAX_CIPHERTEXT_BYTES = 64 * 1024;
const IV_LENGTH = 12;

interface SendBody {
  kreis_id?: number;
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

    let body: SendBody;
    try {
      body = (await request.json()) as SendBody;
    } catch {
      return jsonError(400, 'invalid_json');
    }

    const kreisId = Number(body.kreis_id);
    if (!Number.isInteger(kreisId) || kreisId <= 0) {
      return jsonError(400, 'invalid_kreis_id');
    }
    if (!body.ciphertext_b64 || !body.iv_b64) {
      return jsonError(400, 'missing_fields');
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

    // Membership check.
    const rows = await sql<KreisMembershipRow[]>`
      SELECT member_id, left_at FROM kreis_members
      WHERE kreis_id = ${kreisId} AND member_id = ${session.memberId}
      LIMIT 1
    `;
    if (!canSendToKreis(session.memberId, rows)) {
      return jsonError(403, 'not_a_kreis_member');
    }

    const inserted = await sql<{ id: number; sent_at: Date }[]>`
      INSERT INTO kreis_messages (kreis_id, author_id, ciphertext, iv)
      VALUES (${kreisId}, ${session.memberId}, ${ciphertext}, ${iv})
      RETURNING id, sent_at
    `;
    return new Response(
      JSON.stringify({
        message_id: Number(inserted[0].id),
        sent_at: new Date(inserted[0].sent_at).toISOString(),
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[kreis/send] error', (err as Error).message);
    return jsonError(500, 'internal_error');
  }
};
