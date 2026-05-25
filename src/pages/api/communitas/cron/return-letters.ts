import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { decryptLetter } from '../../../../lib/communitas/crypto';
import { sendMail } from '../../../../lib/communitas/mailer';
import returnLetter from '../../../../lib/communitas/email-templates/return-letter';

export const prerender = false;

/**
 * GET /api/communitas/cron/return-letters
 *
 * Vercel-Cron daily at 09:00 UTC. Selects applications whose
 * `return_letter_at` is today and whose letter has not yet been returned.
 * Decrypts each letter, renders template 12, sends it back to the original
 * applicant. Per-row failures are logged but do not abort the run.
 *
 * NOTE on logging: the decrypted plaintext is NEVER written to a log
 * statement. Only counts are returned.
 */
export const GET: APIRoute = async ({ request }) => {
  // Bearer auth for Vercel-Cron.
  const expected = process.env.CRON_SECRET;
  const got = request.headers.get('authorization') ?? '';
  if (!expected || got !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let due: {
    id: number;
    applicant_name: string;
    applicant_email: string;
    letter_to_self: Buffer;
    letter_iv: Buffer;
    return_letter_at: Date;
  }[] = [];

  try {
    due = await sql<typeof due>`
      SELECT id, applicant_name, applicant_email, letter_to_self, letter_iv, return_letter_at
      FROM applications
      WHERE return_letter_at = current_date
        AND letter_returned_at IS NULL
        AND letter_to_self IS NOT NULL
        AND letter_iv IS NOT NULL
    `;
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, code: 'upstream_error', detail: (err as Error).message }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    try {
      const plaintext = decryptLetter(row.letter_to_self, row.letter_iv);
      const originalDate = new Date(
        row.return_letter_at.getTime() - 365 * 24 * 60 * 60 * 1000,
      ).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const html = returnLetter({
        name: row.applicant_name,
        original_date: originalDate,
        decrypted_letter_content: plaintext,
      });
      const result = await sendMail({
        to: row.applicant_email,
        subject: 'Du hast diesen Brief vor einem Jahr geschrieben.',
        html,
      });
      if (!result.ok) {
        console.warn(
          '[cron/return-letters] mailer failed for application',
          row.id,
          result.code,
        );
        failed++;
        continue;
      }
      // Only mark as returned after a confirmed send.
      await sql`
        UPDATE applications
        SET letter_returned_at = now(), updated_at = now()
        WHERE id = ${row.id}
      `;
      sent++;
    } catch (err) {
      console.warn(
        '[cron/return-letters] per-row failure for application',
        row.id,
        (err as Error).message,
      );
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
