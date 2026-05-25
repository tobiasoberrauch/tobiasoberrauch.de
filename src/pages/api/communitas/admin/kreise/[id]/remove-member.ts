/**
 * POST /api/communitas/admin/kreise/:id/remove-member — Phase 7 / US5 / T103.
 *
 * Soft-removes a member by setting `kreis_members.left_at = now()`. The
 * symkey is NOT auto-rotated; the remaining members can explicitly call
 * /rotate-code if they want to lock the departed member out of future
 * messages.
 *
 * A quiet email is sent to the remaining members so they know.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../../lib/communitas/db';
import {
  requireCompanion,
  AuthError,
} from '../../../../../../lib/communitas/auth';
import { sendBatched } from '../../../../../../lib/communitas/mailer';
import {
  communitasShell,
  escapeHtml,
} from '../../../../../../lib/communitas/email-templates/_common';

export const prerender = false;

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

    const k = await sql<{ id: number; name: string }[]>`
      SELECT id, name FROM kreise WHERE id = ${kreisId} LIMIT 1
    `;
    if (k.length === 0) return json(404, { ok: false, code: 'not_found' });

    const updated = await sql<{ member_id: number }[]>`
      UPDATE kreis_members
      SET left_at = now()
      WHERE kreis_id = ${kreisId} AND member_id = ${memberId} AND left_at IS NULL
      RETURNING member_id
    `;
    if (updated.length === 0) {
      return json(404, { ok: false, code: 'member_not_active' });
    }

    // Notify remaining members — quietly.
    const remaining = await sql<{ email: string; display_name: string }[]>`
      SELECT m.email, m.display_name
      FROM kreis_members km
      JOIN members m ON m.id = km.member_id
      WHERE km.kreis_id = ${kreisId} AND km.left_at IS NULL
    `;
    const kreisName = escapeHtml(k[0].name);
    const mails = remaining.map((r) => {
      const fn = escapeHtml(r.display_name.split(/\s+/)[0] ?? r.display_name);
      const html = communitasShell(`
        <p style="margin: 0 0 1em;">${fn},</p>
        <p style="margin: 0 0 1em;">Ein Mitglied ist aus dem Kreis <strong>${kreisName}</strong> gegangen.</p>
        <p style="margin: 0 0 1em;">Der Code bleibt unverändert. Wenn ihr einen neuen wollt, sagt es Tobias.</p>
        <p style="margin: 2em 0 0;">In Stille,<br/>Tobias</p>
      `);
      return {
        to: r.email,
        subject: 'Ein Mitglied ist gegangen.',
        html,
      };
    });
    try {
      await sendBatched(mails);
    } catch (err) {
      console.warn('[admin/kreise/remove-member] mail error', (err as Error).message);
    }

    return json(200, { ok: true, member_id: memberId });
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[admin/kreise/remove-member] error', (err as Error).message);
    return json(500, { ok: false, code: 'internal_error' });
  }
};
