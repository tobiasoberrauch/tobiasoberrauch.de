import type { APIRoute } from 'astro';
import { sql } from '../../../lib/communitas/db';
import { encryptLetter } from '../../../lib/communitas/crypto';
import { sendMail } from '../../../lib/communitas/mailer';
import { validateApplicationBody } from '../../../lib/communitas/validation';
import confirmation from '../../../lib/communitas/email-templates/confirmation';

export const prerender = false;

/**
 * POST /api/communitas/apply — Public application endpoint.
 *
 * Accepts both `application/json` and `application/x-www-form-urlencoded`
 * (FR: form must work without JavaScript). Persists encrypted letter-to-self,
 * sends confirmation email (template 1), notifies the admin mailbox.
 */
export const POST: APIRoute = async ({ request }) => {
  // ----- Parse body (JSON or form-urlencoded) ----------------------------
  const contentType = request.headers.get('content-type') ?? '';
  let raw: unknown = null;
  try {
    if (contentType.includes('application/json')) {
      raw = await request.json();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const fd = await request.formData();
      const obj: Record<string, unknown> = {};
      for (const [k, v] of fd.entries()) {
        obj[k] = typeof v === 'string' ? v : '';
      }
      raw = obj;
    } else {
      // Best-effort fallback: try JSON
      raw = await request.json();
    }
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'name' });
  }

  // ----- Validate --------------------------------------------------------
  const result = validateApplicationBody(raw);
  if (!result.ok) {
    return json(400, { ok: false, code: result.code, field: result.field });
  }
  const v = result.value;

  // ----- 30-day duplicate check ------------------------------------------
  try {
    const dup = await sql<{ id: number }[]>`
      SELECT id FROM applications
      WHERE applicant_email = ${v.email}
        AND received_at > now() - interval '30 days'
      LIMIT 1
    `;
    if (dup.length > 0) {
      return json(409, { ok: false, code: 'already_applied' });
    }
  } catch (err) {
    // DB not reachable — fail closed but with a clear code.
    return json(503, {
      ok: false,
      code: 'not_configured',
      detail: (err as Error).message,
    });
  }

  // ----- Encrypt letter-to-self if present -------------------------------
  let letterBuf: Buffer | null = null;
  let letterIv: Buffer | null = null;
  if (v.letter_to_self.trim().length > 0) {
    try {
      const enc = encryptLetter(v.letter_to_self);
      letterBuf = enc.ciphertext;
      letterIv = enc.iv;
    } catch (err) {
      // LETTER_ENCRYPTION_KEY missing or malformed — refuse rather than
      // store the plaintext.
      return json(503, {
        ok: false,
        code: 'not_configured',
        detail: (err as Error).message,
      });
    }
  }

  // ----- ip_country (DSGVO: 2-char only) --------------------------------
  const ipCountry =
    (request.headers.get('x-vercel-ip-country') ?? '')
      .toLowerCase()
      .slice(0, 2) || null;

  // ----- Insert application row -----------------------------------------
  let applicationId: number;
  try {
    const rows = await sql<{ id: number }[]>`
      INSERT INTO applications (
        applicant_name,
        applicant_email,
        question_text,
        letter_to_self,
        letter_iv,
        desired_tier,
        return_letter_at,
        ip_country
      ) VALUES (
        ${v.name},
        ${v.email},
        ${v.question},
        ${letterBuf},
        ${letterIv},
        ${v.desired_tier},
        ${sql`current_date + interval '1 year'`},
        ${ipCountry}
      )
      RETURNING id
    `;
    applicationId = Number(rows[0].id);
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'not_configured',
      detail: (err as Error).message,
    });
  }

  // ----- Send confirmation email (best-effort; do not fail the row) ------
  try {
    const html = confirmation({ name: v.name });
    const res = await sendMail({
      to: v.email,
      subject: 'Deine Bewerbung ist eingegangen.',
      html,
    });
    if (!res.ok && res.code !== 'not_configured') {
      // Log only; row is saved.
      console.warn('[communitas/apply] mailer error', res.code, res.detail);
    }
  } catch (err) {
    console.warn('[communitas/apply] mailer threw', (err as Error).message);
  }

  // ----- Admin notification (best-effort) -------------------------------
  const adminTo = process.env.COMMUNITAS_ADMIN_NOTIFY_EMAIL;
  if (adminTo) {
    try {
      await sendMail({
        to: adminTo,
        subject: `Neue Bewerbung: ${v.name}`,
        html: `<p>Eine neue Bewerbung ist eingegangen.</p>
<p><strong>Name:</strong> ${escapeHtml(v.name)}<br/>
<strong>E-Mail:</strong> ${escapeHtml(v.email)}<br/>
<strong>Gewünschte Stufe:</strong> ${v.desired_tier}<br/>
<strong>Brief an sich selbst hinterlegt:</strong> ${letterBuf ? 'ja' : 'nein'}</p>
<p><strong>Frage:</strong></p>
<p style="white-space: pre-wrap;">${escapeHtml(v.question)}</p>
<p>Bewerbungs-ID: ${applicationId}</p>`,
      });
    } catch (err) {
      console.warn('[communitas/apply] admin notify error', (err as Error).message);
    }
  }

  // ----- Done -----------------------------------------------------------
  // If the request came from a non-JS form post, the user expects a redirect.
  // For JSON requests we return 202 with a body.
  const accepts = request.headers.get('accept') ?? '';
  if (
    !accepts.includes('application/json') &&
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    return new Response(null, {
      status: 303,
      headers: { location: '/communitas/danke/' },
    });
  }

  return json(202, { ok: true, message: 'Bestätigung folgt per E-Mail.' });
};

// ---------------------------------------------------------------------------

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
