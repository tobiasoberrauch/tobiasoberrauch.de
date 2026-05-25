/**
 * POST /api/communitas/admin/stille-versammlung/invite
 *
 * Phase 8 / T109b.
 *
 * One-shot announcement for the monthly Stille Versammlung (Spec FR-027).
 * Companion-only. Body:
 *   { date_label: string, time_local: string, jitsi_url: string }
 *
 * Sends Template 10 to all active members. No DB persistence — Tobias picks
 * the date manually each month and re-invites.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../../lib/communitas/auth';
import { sendBatched, type MailParams } from '../../../../../lib/communitas/mailer';
import silentAssemblyInvitation from '../../../../../lib/communitas/email-templates/silent-assembly-invitation';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface InviteBody {
  date_label: string;
  time_local: string;
  jitsi_url: string;
}

function validate(raw: unknown): InviteBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const date = typeof r.date_label === 'string' ? r.date_label.trim() : '';
  const time = typeof r.time_local === 'string' ? r.time_local.trim() : '';
  const url = typeof r.jitsi_url === 'string' ? r.jitsi_url.trim() : '';
  if (date.length < 5 || date.length > 200) return null;
  if (time.length < 3 || time.length > 100) return null;
  if (!/^https:\/\/[\w.\-:/?&=%]+$/.test(url)) return null;
  return { date_label: date, time_local: time, jitsi_url: url };
}

export const POST: APIRoute = async ({ request }) => {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'body' });
  }
  const v = validate(body);
  if (!v) return json(400, { ok: false, code: 'validation_error' });

  const recipients = await sql<{ email: string }[]>`
    SELECT email FROM members
    WHERE left_on IS NULL AND paused_until IS NULL
  `;

  const html = silentAssemblyInvitation({
    date_label: v.date_label,
    time_local: v.time_local,
    jitsi_url: v.jitsi_url,
  });
  const subject = `Stille Versammlung — ${v.date_label}`;

  const messages: MailParams[] = recipients.map((r) => ({
    to: r.email,
    subject,
    html,
  }));

  const results = await sendBatched(messages);
  let sent = 0;
  let errors = 0;
  for (const r of results) {
    if (r.ok || r.code === 'not_configured') sent++;
    else errors++;
  }
  return json(200, { ok: true, sent_to: sent, errors });
};
