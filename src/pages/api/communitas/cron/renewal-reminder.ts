/**
 * GET /api/communitas/cron/renewal-reminder
 *
 * Phase 8 (deferred from Phase 5).
 *
 * Weekly Tuesday 09:00 UTC. For each active subscription whose
 * `current_period_end` is between 24 and 30 days out and which has NOT
 * received a renewal-reminder in the past 60 days, send template 11
 * (renewal-reminder) with a one-click HMAC cancel link.
 *
 * Idempotency: we set `renewal_reminder_sent_at = now()` after a successful
 * send. The 60-day dedupe window handles the edge case where a subscription
 * straddles renewal (so the same subscription_id doesn't trip the reminder
 * twice in adjacent periods).
 *
 * Privacy: we never log emails, only member_id. Failure detail is recorded
 * but the row is not rolled back (the next pass will skip via the dedupe
 * window — better one missed reminder than a duplicate, per Spec FR-019's
 * sober-once principle).
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { sendBatched, type MailParams } from '../../../../lib/communitas/mailer';
import { createCancelToken } from '../../../../lib/communitas/cancel-token';
import renewalReminderTemplate from '../../../../lib/communitas/email-templates/renewal-reminder';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface Row {
  subscription_id: number;
  member_id: number;
  email: string;
  display_name: string;
  current_period_end: Date;
}

function germanDate(d: Date): string {
  return d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const GET: APIRoute = async ({ request }) => {
  const expected = process.env.CRON_SECRET;
  const got = request.headers.get('authorization') ?? '';
  if (!expected || got !== `Bearer ${expected}`) {
    return json(401, { ok: false, code: 'unauthorized' });
  }

  let rows: Row[] = [];
  try {
    rows = await sql<Row[]>`
      SELECT
        s.id AS subscription_id,
        s.member_id,
        m.email,
        m.display_name,
        s.current_period_end
      FROM subscriptions s
      JOIN members m ON m.id = s.member_id
      WHERE s.status = 'active'
        AND m.left_on IS NULL
        AND (s.current_period_end - current_date) BETWEEN 24 AND 30
        AND (
          s.renewal_reminder_sent_at IS NULL
          OR s.renewal_reminder_sent_at < now() - INTERVAL '60 days'
        )
    `;
  } catch (err) {
    return json(503, {
      ok: false,
      code: 'upstream_error',
      detail: (err as Error).message,
    });
  }

  const siteUrl = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';
  const messages: MailParams[] = [];
  const subIds: number[] = [];
  for (const r of rows) {
    let token: string;
    try {
      token = createCancelToken(Number(r.subscription_id));
    } catch (err) {
      console.warn(
        '[cron:renewal-reminder] token failed for member_id=',
        r.member_id,
        (err as Error).message,
      );
      continue;
    }
    const url = `${siteUrl}/api/communitas/subscription/cancel?token=${encodeURIComponent(token)}`;
    messages.push({
      to: r.email,
      subject: 'Bleibe ich? Gehe ich?',
      html: renewalReminderTemplate({
        name: r.display_name,
        renewal_date: germanDate(new Date(r.current_period_end)),
        one_click_cancel_url: url,
      }),
    });
    subIds.push(Number(r.subscription_id));
  }

  const results = await sendBatched(messages);
  let sent = 0;
  let errors = 0;
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.ok || res.code === 'not_configured') {
      sent++;
      try {
        await sql`
          UPDATE subscriptions
          SET renewal_reminder_sent_at = now()
          WHERE id = ${subIds[i]}
        `;
      } catch (err) {
        console.warn(
          '[cron:renewal-reminder] mark-sent failed for sub_id=',
          subIds[i],
          (err as Error).message,
        );
      }
    } else {
      errors++;
    }
  }

  return json(200, { ok: true, sent, errors, considered: rows.length });
};
