/**
 * GET /api/communitas/kreis/:id/messages — Phase 7 / US5 / T100.
 *
 * Returns the encrypted message stream for a kreis. The server has no
 * key and never decrypts. We project the metadata + ciphertext + iv;
 * the browser decrypts using the symkey from IndexedDB.
 *
 * Read-forward-only: when a new member is added later, they receive
 * `kreis_members.joined_at = now()`. This endpoint filters messages so
 * that the caller only sees those sent at or after their own joined_at.
 * This implements the spec rule that the new member does not get
 * retroactive access to the kreis's past.
 *
 * Query params:
 *   since  — ISO datetime; default = 30 days before now
 *   limit  — max 100, default 50
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../../lib/communitas/auth';

export const prerender = false;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_WINDOW_DAYS = 30;

interface MembershipRow {
  joined_at: Date | string;
  left_at: Date | string | null;
}

interface KreisRow {
  id: number;
  name: string;
}

interface MessageRow {
  id: number;
  author_id: number;
  author_display_name: string;
  ciphertext: Buffer;
  iv: Buffer;
  sent_at: Date;
}

function jsonError(status: number, code: string): Response {
  return new Response(JSON.stringify({ ok: false, code }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function firstName(displayName: string): string {
  return displayName.split(/\s+/)[0] ?? displayName;
}

export const GET: APIRoute = async ({ request, params, url }) => {
  try {
    const session = await requireMember(request);
    const idRaw = params.id;
    const kreisId = idRaw ? Number(idRaw) : NaN;
    if (!Number.isFinite(kreisId) || kreisId <= 0) {
      return jsonError(404, 'not_found');
    }

    // Membership + joined_at lookup.
    const mem = await sql<MembershipRow[]>`
      SELECT joined_at, left_at
      FROM kreis_members
      WHERE kreis_id = ${kreisId} AND member_id = ${session.memberId}
      LIMIT 1
    `;
    if (mem.length === 0 || mem[0].left_at != null) {
      return jsonError(403, 'not_a_kreis_member');
    }
    const joinedAt = new Date(mem[0].joined_at);

    const kreisRows = await sql<KreisRow[]>`
      SELECT id, name FROM kreise WHERE id = ${kreisId} LIMIT 1
    `;
    if (kreisRows.length === 0) {
      return jsonError(404, 'not_found');
    }

    // Compute since (defaults to 30 days back, but clamped to joined_at).
    const sinceParam = url.searchParams.get('since');
    let since: Date;
    if (sinceParam) {
      const parsed = new Date(sinceParam);
      since = Number.isNaN(parsed.getTime())
        ? new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
        : parsed;
    } else {
      since = new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    }
    // Read-forward-only clamp.
    if (since.getTime() < joinedAt.getTime()) {
      since = joinedAt;
    }

    const limitParam = url.searchParams.get('limit');
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const n = Number(limitParam);
      if (Number.isFinite(n) && n > 0) {
        limit = Math.min(Math.floor(n), MAX_LIMIT);
      }
    }

    const messages = await sql<MessageRow[]>`
      SELECT
        m.id,
        m.author_id,
        mb.display_name AS author_display_name,
        m.ciphertext,
        m.iv,
        m.sent_at
      FROM kreis_messages m
      JOIN members mb ON mb.id = m.author_id
      WHERE m.kreis_id = ${kreisId}
        AND m.sent_at >= ${since}
      ORDER BY m.sent_at DESC
      LIMIT ${limit}
    `;

    const payload = {
      kreis: { id: Number(kreisRows[0].id), name: kreisRows[0].name },
      joined_at: joinedAt.toISOString(),
      messages: messages.map((m) => {
        const ct = Buffer.isBuffer(m.ciphertext)
          ? m.ciphertext
          : Buffer.from(m.ciphertext as unknown as Uint8Array);
        const iv = Buffer.isBuffer(m.iv)
          ? m.iv
          : Buffer.from(m.iv as unknown as Uint8Array);
        return {
          id: Number(m.id),
          author_id: Number(m.author_id),
          author_display_name: firstName(m.author_display_name),
          ciphertext_b64: ct.toString('base64'),
          iv_b64: iv.toString('base64'),
          sent_at: new Date(m.sent_at).toISOString(),
        };
      }),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[kreis/messages] error', (err as Error).message);
    return jsonError(500, 'internal_error');
  }
};
