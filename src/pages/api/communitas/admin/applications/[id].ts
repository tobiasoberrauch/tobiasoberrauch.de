import type { APIRoute } from 'astro';
import { sql } from '../../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../../lib/communitas/auth';
import { sendMail } from '../../../../../lib/communitas/mailer';
import acceptance from '../../../../../lib/communitas/email-templates/acceptance';
import decline from '../../../../../lib/communitas/email-templates/decline';

export const prerender = false;

/**
 * PATCH /api/communitas/admin/applications/:id
 *
 * Transition rules (Spec):
 *   received        → in_conversation | declined | withdrawn
 *   in_conversation → accepted | declined | withdrawn
 *   accepted        → (terminal here; later subscription flow takes over)
 *   declined        → (terminal)
 *   withdrawn       → (terminal)
 *
 * On `accepted`: insert a `members` row, send acceptance email (Phase-5 will
 * inject the live Stripe checkout URL; for now the template communicates that
 * "Der Zahlungslink folgt in den nächsten Tagen.").
 * On `declined`: send the decline email.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    await requireCompanion(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, {
        ok: false,
        code: err.status === 403 ? 'forbidden' : 'unauthorized',
      });
    }
    throw err;
  }

  const idStr = params.id ?? '';
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return json(400, { ok: false, code: 'validation_error', field: 'id' });
  }

  let body: { status?: string; status_note?: string };
  try {
    body = (await request.json()) as { status?: string; status_note?: string };
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'body' });
  }

  const next = body.status;
  if (
    next !== 'in_conversation' &&
    next !== 'accepted' &&
    next !== 'declined' &&
    next !== 'withdrawn'
  ) {
    return json(400, { ok: false, code: 'validation_error', field: 'status' });
  }
  const note = typeof body.status_note === 'string' ? body.status_note : null;

  // Fetch current row for transition check.
  const rows = await sql<
    {
      id: number;
      applicant_name: string;
      applicant_email: string;
      status: string;
    }[]
  >`
    SELECT id, applicant_name, applicant_email, status
    FROM applications
    WHERE id = ${id}
    LIMIT 1
  `;
  if (rows.length === 0) {
    return json(404, { ok: false, code: 'not_found' });
  }
  const app = rows[0];

  if (!isValidTransition(app.status, next)) {
    return json(409, {
      ok: false,
      code: 'invalid_transition',
      detail: `${app.status} → ${next}`,
    });
  }

  // Apply transition.
  await sql`
    UPDATE applications
    SET status = ${next}, status_note = ${note}, updated_at = now()
    WHERE id = ${id}
  `;

  let memberId: number | undefined;

  if (next === 'accepted') {
    const displayName = (app.applicant_name.split(/\s+/)[0] ?? app.applicant_name).slice(0, 80);
    // Insert member row. On unique-email conflict, fetch existing id.
    try {
      const ins = await sql<{ id: number }[]>`
        INSERT INTO members (
          application_id,
          email,
          display_name,
          current_schale_key,
          role
        ) VALUES (
          ${id},
          ${app.applicant_email},
          ${displayName},
          'speculum',
          'member'
        )
        ON CONFLICT (email) DO UPDATE SET application_id = EXCLUDED.application_id
        RETURNING id
      `;
      memberId = Number(ins[0].id);
    } catch (err) {
      console.warn('[admin/apps PATCH] member insert failed', (err as Error).message);
    }

    // Send acceptance mail. Phase-5: pass real checkout URL here.
    try {
      const html = acceptance({ name: app.applicant_name });
      await sendMail({
        to: app.applicant_email,
        subject: 'Du bist eingeladen.',
        html,
      });
    } catch (err) {
      console.warn('[admin/apps PATCH] acceptance mail error', (err as Error).message);
    }
  } else if (next === 'declined') {
    try {
      const html = decline({ name: app.applicant_name });
      await sendMail({
        to: app.applicant_email,
        subject: 'Eine andere Tür.',
        html,
      });
    } catch (err) {
      console.warn('[admin/apps PATCH] decline mail error', (err as Error).message);
    }
  }

  return json(200, memberId !== undefined ? { status: next, member_id: memberId } : { status: next });
};

function isValidTransition(from: string, to: string): boolean {
  if (from === 'received') {
    return to === 'in_conversation' || to === 'declined' || to === 'withdrawn';
  }
  if (from === 'in_conversation') {
    return to === 'accepted' || to === 'declined' || to === 'withdrawn';
  }
  return false;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
