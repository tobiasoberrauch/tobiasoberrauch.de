/**
 * POST /api/communitas/admin/kreise/:id/add-member — Phase 7 / US5 / T102.
 *
 * Adds a single member to an existing kreis using the read-forward-only
 * approach: the new member is inserted with `joined_at = now()`, and the
 * /messages endpoint filters on `sent_at >= caller.joined_at`, so the
 * new member never sees the kreis's past correspondence.
 *
 * The existing 6-word code stays valid for everyone — including the new
 * member, who needs the code to derive the symkey. Since the server
 * never stores the code, an admin who wants to deliver the code to the
 * new member must use POST /rotate-code (which generates a new code,
 * mails it to ALL current members, and effectively restarts the kreis).
 *
 * This endpoint sends a quieter introduction mail that asks the new
 * member to obtain the code from the other members or from Tobias.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../../lib/communitas/db';
import {
  requireCompanion,
  AuthError,
} from '../../../../../../lib/communitas/auth';
import { sendMail } from '../../../../../../lib/communitas/mailer';
import { communitasShell, escapeHtml } from '../../../../../../lib/communitas/email-templates/_common';

export const prerender = false;

const SITE_URL = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface Body {
  member_id?: number;
}

export const POST: APIRoute = async ({ request, params }) => {
  try {
    await requireCompanion(request);
    const kreisId = Number(params.id);
    if (!Number.isFinite(kreisId) || kreisId <= 0) {
      return json(404, { ok: false, code: 'not_found' });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return json(400, { ok: false, code: 'invalid_json' });
    }
    const memberId = Number(body.member_id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return json(400, { ok: false, code: 'invalid_member_id' });
    }

    // Kreis must exist + not archived.
    const k = await sql<{ id: number; name: string }[]>`
      SELECT id, name FROM kreise
      WHERE id = ${kreisId} AND archived_at IS NULL LIMIT 1
    `;
    if (k.length === 0) return json(404, { ok: false, code: 'not_found' });

    // Resolve member + tier.
    const mRows = await sql<{
      id: number;
      email: string;
      display_name: string;
      tier: string | null;
    }[]>`
      SELECT
        m.id, m.email, m.display_name,
        (
          SELECT tier FROM subscriptions
          WHERE member_id = m.id AND status IN ('active','paused','scholarship')
          ORDER BY created_at DESC LIMIT 1
        ) AS tier
      FROM members m
      WHERE m.id = ${memberId} AND m.left_on IS NULL LIMIT 1
    `;
    if (mRows.length === 0) return json(404, { ok: false, code: 'member_not_found' });
    const m = mRows[0];
    if (m.tier !== 'voll' && m.tier !== 'inner_circle') {
      return json(400, { ok: false, code: 'member_tier_insufficient' });
    }

    // Already an active member?
    const existing = await sql<{ left_at: Date | string | null }[]>`
      SELECT left_at FROM kreis_members
      WHERE kreis_id = ${kreisId} AND member_id = ${memberId} LIMIT 1
    `;
    if (existing.length > 0) {
      if (existing[0].left_at == null) {
        return json(409, { ok: false, code: 'already_member' });
      }
      // Previously left → re-activate (joined_at = now() => still read-forward).
      await sql`
        UPDATE kreis_members
        SET joined_at = now(), left_at = NULL
        WHERE kreis_id = ${kreisId} AND member_id = ${memberId}
      `;
    } else {
      await sql`
        INSERT INTO kreis_members (kreis_id, member_id)
        VALUES (${kreisId}, ${memberId})
      `;
    }

    // Quieter mail — the code must be re-shared by the existing kreis
    // members (or via rotate-code by an admin).
    const firstName = (m.display_name.split(/\s+/)[0] ?? m.display_name);
    const kreisName = escapeHtml(k[0].name);
    const kreisUrl = `${SITE_URL}/communitas-mitglied/kreis/${kreisId}`;
    const body_html = `
      <p style="margin: 0 0 1em;">${escapeHtml(firstName)},</p>
      <p style="margin: 0 0 1em;">du bist in den Kreis <strong>${kreisName}</strong> aufgenommen worden.</p>
      <p style="margin: 0 0 1em;">Den sechs-Wort-Code, den du brauchst, hat dieser Kreis bereits — die anderen Mitglieder kennen ihn. Frag eines von ihnen oder Tobias.</p>
      <p style="margin: 0 0 1em;">Wenn du den Code hast, gib ihn hier ein:<br/><a href="${escapeHtml(kreisUrl)}" style="color: #1c1917;">${escapeHtml(kreisUrl)}</a></p>
      <p style="margin: 0 0 1em;">Die Briefe, die vor deinem Eintritt geschrieben wurden, gehören den anderen — du startest mit uns ab jetzt.</p>
      <p style="margin: 2em 0 0;">In Stille,<br/>Tobias</p>
    `;
    try {
      await sendMail({
        to: m.email,
        subject: 'Du bist in einen Kreis aufgenommen worden.',
        html: communitasShell(body_html),
      });
    } catch (err) {
      console.warn('[admin/kreise/add-member] mail error', (err as Error).message);
    }

    return json(200, { ok: true, member_id: memberId });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[admin/kreise/add-member] error', (err as Error).message);
    return json(500, { ok: false, code: 'internal_error' });
  }
};
