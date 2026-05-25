import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { sql } from '../../../../lib/communitas/db';
import { createMagicLink } from '../../../../lib/communitas/auth';
import { sendMail } from '../../../../lib/communitas/mailer';
import magicLinkTemplate from '../../../../lib/communitas/email-templates/magic-link';

export const prerender = false;

/**
 * POST /api/communitas/auth/magic-link
 *
 * Public endpoint. Always answers 204 No Content — even when the e-mail is
 * unknown — to avoid account enumeration.
 *
 * Rate-limit: max 5 calls per 15 minutes per e-mail (keyed by SHA-256 hash
 * so we do not retain raw e-mail strings in the in-memory map). The map
 * resets on cold-start; this is acceptable for Phase 4 and will move to
 * Postgres in Phase 6 if needed.
 *
 * Accepts both `application/json` ({ "email": "..." }) and form-urlencoded
 * (`email=...`) bodies, mirroring the public /apply endpoint.
 */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>(); // emailHash -> timestamps

function rateLimitHit(emailHash: string): boolean {
  const now = Date.now();
  const history = rateLimitMap.get(emailHash) ?? [];
  const recent = history.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(emailHash, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(emailHash, recent);
  return false;
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

export const POST: APIRoute = async ({ request, url }) => {
  // ----- Parse body ------------------------------------------------------
  const contentType = request.headers.get('content-type') ?? '';
  let email = '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { email?: unknown };
      if (typeof body?.email === 'string') email = body.email.trim();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const fd = await request.formData();
      const v = fd.get('email');
      if (typeof v === 'string') email = v.trim();
    } else {
      // Best-effort JSON
      const body = (await request.json().catch(() => ({}))) as {
        email?: unknown;
      };
      if (typeof body?.email === 'string') email = body.email.trim();
    }
  } catch {
    return noContent();
  }

  if (!email) return noContent();

  // Trivial email shape gate — no enumeration; we just stop processing.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return noContent();

  const emailHash = sha256Hex(email.toLowerCase());
  if (rateLimitHit(emailHash)) {
    return new Response(JSON.stringify({ ok: false, code: 'rate_limit' }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    });
  }

  // ----- Look up an active member ---------------------------------------
  let memberId: number | null = null;
  let displayName = '';
  try {
    const rows = await sql<{ id: number; display_name: string }[]>`
      SELECT id, display_name
      FROM members
      WHERE email = ${email}
        AND left_on IS NULL
      LIMIT 1
    `;
    if (rows.length > 0) {
      memberId = Number(rows[0].id);
      displayName = rows[0].display_name;
    }
  } catch {
    // DB unreachable — fail silently to preserve the 204 invariant.
    return noContent();
  }

  if (memberId === null) {
    // Unknown e-mail: act exactly as if we accepted the request.
    return noContent();
  }

  // ----- Create token + send mail ---------------------------------------
  try {
    const { token } = await createMagicLink(memberId);
    const origin = new URL(url).origin;
    const linkUrl = `${origin}/communitas-mitglied/login?t=${encodeURIComponent(token)}`;
    const html = magicLinkTemplate({
      name: displayName,
      magic_link_url: linkUrl,
    });
    const res = await sendMail({
      to: email,
      subject: 'Dein Schlüssel zur Communitas.',
      html,
    });
    if (!res.ok && res.code !== 'not_configured') {
      console.warn('[magic-link] mailer error', res.code);
    }
    console.info(`[magic-link] requested for member_id=${memberId}`);
  } catch (err) {
    console.warn('[magic-link] token/send failed', (err as Error).message);
  }

  return noContent();
};
