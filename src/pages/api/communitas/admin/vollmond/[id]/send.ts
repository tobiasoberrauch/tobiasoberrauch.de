/**
 * POST /api/communitas/admin/vollmond/[id]/send
 *
 * Phase 8 / T109.
 *
 * Sends a draft full-moon letter to all active Voll + Inner Circle members.
 *
 * - Re-verifies the Vier-Stimmen-Constraint at send time (FR-029) — even if
 *   the draft passed it at create time, the share may have shifted.
 * - Each recipient gets their own HMAC cancel token (FR-019), embedded into
 *   the body's „Bleibe ich? Gehe ich?"-Footer.
 * - Uses sendBatched() to respect Resend rate limits.
 * - Sets full_moon_letters.sent_at = now() on success.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../../../lib/communitas/auth';
import { sendBatched, type MailParams } from '../../../../../../lib/communitas/mailer';
import { createCancelToken } from '../../../../../../lib/communitas/cancel-token';
import fullMoonTemplate, {
  germanMonth,
} from '../../../../../../lib/communitas/email-templates/full-moon';
import { wouldViolateFourVoices } from '../../vollmond';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface LetterRow {
  id: number;
  full_moon_date: Date;
  author_id: number;
  body_markdown: string;
  sent_at: Date | null;
  author_first_name: string;
  author_role: string;
}

interface RecipientRow {
  id: number;
  email: string;
  display_name: string;
  subscription_id: number | null;
}

function germanDateLabel(d: Date): string {
  return d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const POST: APIRoute = async ({ request, params }) => {
  try {
    await requireCompanion(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, {
        ok: false,
        code: err.status === 401 ? 'unauthorized' : 'forbidden',
      });
    }
    return json(401, { ok: false, code: 'unauthorized' });
  }

  const letterId = Number(params.id);
  if (!Number.isFinite(letterId) || letterId <= 0) {
    return json(400, { ok: false, code: 'validation_error', field: 'id' });
  }

  const letters = await sql<LetterRow[]>`
    SELECT
      fml.id, fml.full_moon_date, fml.author_id, fml.body_markdown, fml.sent_at,
      split_part(m.display_name, ' ', 1) AS author_first_name,
      m.role AS author_role
    FROM full_moon_letters fml
    JOIN members m ON m.id = fml.author_id
    WHERE fml.id = ${letterId}
    LIMIT 1
  `;
  if (letters.length === 0) {
    return json(404, { ok: false, code: 'not_found' });
  }
  const letter = letters[0];
  if (letter.sent_at) {
    return json(400, { ok: false, code: 'validation_error', detail: 'already_sent' });
  }

  const authorRole = letter.author_role === 'founder' ? 'founder' : 'companion';
  const check = await wouldViolateFourVoices(authorRole);
  if (check.violates) {
    return json(400, {
      ok: false,
      code: 'four_voices_violation',
      detail: `Tobias hat ${check.foundersShare} der letzten ${check.total} Briefe geschrieben. Eine andere Stimme ist dran.`,
    });
  }

  const recipients = await sql<RecipientRow[]>`
    SELECT
      m.id, m.email, m.display_name,
      (
        SELECT s.id FROM subscriptions s
        WHERE s.member_id = m.id
          AND s.status IN ('active', 'scholarship')
          AND s.tier IN ('voll', 'inner_circle')
        ORDER BY s.created_at DESC LIMIT 1
      ) AS subscription_id
    FROM members m
    WHERE m.left_on IS NULL
      AND m.paused_until IS NULL
      AND EXISTS (
        SELECT 1 FROM subscriptions s2
        WHERE s2.member_id = m.id
          AND s2.status IN ('active', 'scholarship')
          AND s2.tier IN ('voll', 'inner_circle')
      )
  `;

  const dateLabel = `Vollmond, ${germanDateLabel(new Date(letter.full_moon_date))}`;
  const subject = `Vollmond — ${germanMonth(new Date(letter.full_moon_date))}.`;
  const siteUrl = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';

  const messages: MailParams[] = [];
  let skipped = 0;
  for (const rec of recipients) {
    if (!rec.subscription_id) {
      skipped++;
      continue;
    }
    let token: string;
    try {
      token = createCancelToken(Number(rec.subscription_id));
    } catch (err) {
      console.warn(
        '[vollmond/send] token failed for member_id=',
        rec.id,
        (err as Error).message,
      );
      skipped++;
      continue;
    }
    const cancelUrl = `${siteUrl}/api/communitas/subscription/cancel?token=${encodeURIComponent(token)}`;
    const html = fullMoonTemplate({
      author_first_name: letter.author_first_name,
      body_markdown: letter.body_markdown,
      full_moon_date_label: dateLabel,
      one_click_cancel_url: cancelUrl,
    });
    messages.push({ to: rec.email, subject, html });
  }

  const results = await sendBatched(messages);
  let sent = 0;
  let errors = 0;
  for (const r of results) {
    if (r.ok || r.code === 'not_configured') sent++;
    else errors++;
  }

  await sql`
    UPDATE full_moon_letters SET sent_at = now() WHERE id = ${letterId}
  `;

  return json(200, { ok: true, sent_to: sent, skipped, errors });
};
