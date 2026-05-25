/**
 * POST /api/communitas/admin/kreise/:id/rotate-code — Phase 7 / US5 / T103.
 *
 * Generates a new Argon2id salt + a new 6-word code, persists the salt,
 * and emails the new introduction to every CURRENT member of the kreis.
 *
 * Trade-off: all previously-stored ciphertext becomes unreadable. The UI
 * will display "Dieser Brief konnte nicht entschlüsselt werden." for any
 * message encrypted with the old key. This is the spec-accepted price of
 * key rotation — the alternative would be re-encrypting on the server,
 * which would violate server-blindness.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../../lib/communitas/db';
import {
  requireCompanion,
  AuthError,
} from '../../../../../../lib/communitas/auth';
import { sendBatched } from '../../../../../../lib/communitas/mailer';
import {
  generateKreisCode,
  generateKreisSalt,
} from '../../../../../../lib/communitas/kreis-crypto';
import kreisIntroduction from '../../../../../../lib/communitas/email-templates/kreis-introduction';

export const prerender = false;

const SITE_URL = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, params }) => {
  try {
    await requireCompanion(request);
    const kreisId = Number(params.id);
    if (!Number.isFinite(kreisId) || kreisId <= 0) {
      return json(404, { ok: false, code: 'not_found' });
    }

    const kRows = await sql<
      { id: number; name: string; introductory_question: string }[]
    >`
      SELECT id, name, introductory_question FROM kreise
      WHERE id = ${kreisId} AND archived_at IS NULL LIMIT 1
    `;
    if (kRows.length === 0) return json(404, { ok: false, code: 'not_found' });
    const k = kRows[0];

    const members = await sql<{ id: number; email: string; display_name: string }[]>`
      SELECT m.id, m.email, m.display_name
      FROM kreis_members km
      JOIN members m ON m.id = km.member_id
      WHERE km.kreis_id = ${kreisId} AND km.left_at IS NULL
    `;
    if (members.length === 0) {
      return json(409, { ok: false, code: 'no_active_members' });
    }

    const newSalt = generateKreisSalt();
    const codeWords = generateKreisCode();
    const codeJoined = codeWords.join(' ');

    await sql`
      UPDATE kreise SET symkey_salt = ${newSalt} WHERE id = ${kreisId}
    `;

    const firstName = (full: string): string => full.split(/\s+/)[0] ?? full;
    const kreisUrl = `${SITE_URL}/communitas-mitglied/kreis/${kreisId}`;
    const mails = members.map((m) => {
      const others = members
        .filter((o) => o.id !== m.id)
        .map((o) => firstName(o.display_name));
      const html = kreisIntroduction({
        recipient_name: firstName(m.display_name),
        kreis_name: k.name,
        introductory_question: k.introductory_question,
        other_members_first_names: others,
        code_six_words: codeJoined,
        kreis_url: kreisUrl,
      });
      return {
        to: m.email,
        subject: 'Neuer Code für deinen Kreis.',
        html,
      };
    });

    try {
      await sendBatched(mails);
    } catch (err) {
      console.warn('[admin/kreise/rotate-code] mail error', (err as Error).message);
    }

    return json(200, {
      ok: true,
      kreis_id: kreisId,
      member_count: members.length,
      code_displayed_in_emails: true,
    });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[admin/kreise/rotate-code] error', (err as Error).message);
    return json(500, { ok: false, code: 'internal_error' });
  }
};
