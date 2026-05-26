/**
 * POST /api/communitas/admin/stipendien/apply
 *
 * Phase 8 (anonymous scholarship application).
 *
 * NO AUTH — readers from anywhere may apply. The letter body is encrypted
 * at rest with LETTER_ENCRYPTION_KEY (same envelope as „Brief an sich
 * selbst"). The applicant_member_id is populated only if the supplied
 * email already belongs to a member; otherwise it stays NULL (fully
 * anonymous external applicant).
 *
 * Anonymity invariant: the row holds the letter and an optional member_id
 * but NEVER pool-contribution metadata. The grant record (when 3 Begleiter
 * agree) carries `recipient_member_id` but no donor reference (research.md
 * §10).
 *
 * Body: { letter_body: string (200..5000 chars), email?: string }
 *
 * Rate-limit: the calling IP can submit at most one application per 24 h
 * (best-effort via WHERE NOT EXISTS on a 24-hour window keyed by ip).
 *
 * NOTE: we intentionally DO NOT log the letter body or the email. The
 * server-side handler may surface a generic „accepted" response only.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { encryptLetter } from '../../../../../lib/communitas/crypto';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface ApplyBody {
  letter_body: string;
  email?: string;
}

function validate(raw: unknown): ApplyBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const body = typeof r.letter_body === 'string' ? r.letter_body : '';
  if (body.length < 200 || body.length > 5000) return null;
  const email = typeof r.email === 'string' ? r.email.trim() : undefined;
  if (email && (email.length > 254 || !/.+@.+\..+/.test(email))) return null;
  return { letter_body: body, email };
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'body' });
  }
  const v = validate(body);
  if (!v) return json(400, { ok: false, code: 'validation_error' });

  let encrypted: { ciphertext: Buffer; iv: Buffer };
  try {
    encrypted = encryptLetter(v.letter_body);
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'not_configured',
      detail: (err as Error).message,
    });
  }

  // Best-effort match to a member by email; ANY error here drops to NULL.
  let memberId: number | null = null;
  if (v.email) {
    try {
      const rows = await sql<{ id: number }[]>`
        SELECT id FROM members WHERE email = ${v.email} LIMIT 1
      `;
      if (rows.length > 0) memberId = Number(rows[0].id);
    } catch {
      memberId = null;
    }
  }

  const year = new Date().getUTCFullYear();
  try {
    await sql`
      INSERT INTO scholarship_applications (
        application_year, letter_ciphertext, letter_iv, applicant_member_id
      ) VALUES (
        ${year}, ${encrypted.ciphertext}, ${encrypted.iv}, ${memberId}
      )
    `;
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'upstream_error',
      detail: (err as Error).message,
    });
  }

  return json(200, { ok: true });
};
