/**
 * POST /api/communitas/account/leave
 *
 * Phase 6 / US4 / T092.
 *
 * One-way door. Requires a recent export (within 30 days) so the member
 * has their data in hand before we delete the server-side copy.
 *
 * Order of operations:
 *   1. Validate confirmation.
 *   2. Check that an export happened within the last 30 days.
 *   3. Send the farewell email FIRST. If deletion fails afterward, the
 *      member still got the message that matches what they expect.
 *   4. Delete cell_entries, kreis_messages (only by this author),
 *      sessions, magic_links.
 *   5. Set members.left_on = current_date.
 *   6. Best-effort: Stripe subscription cancel_at_period_end.
 *
 * Note on kreis messages: we delete only the leaving member's OWN
 * messages. Messages other members wrote to the same kreis stay
 * (their authors keep their words). The kreis_members row is updated
 * with left_at; the kreis itself is unaffected.
 *
 * Subscriptions stay on the books for accounting; the member_id FK
 * cascades only on members-delete, which we do NOT do (we soft-mark
 * left_on instead — German tax law requires retention of payment
 * records for years; we cannot purge subscriptions on member request).
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';
import { sendMail } from '../../../../lib/communitas/mailer';
import farewell from '../../../../lib/communitas/email-templates/farewell';

export const prerender = false;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await requireMember(request);
    let body: { confirmation?: string };
    try {
      body = (await request.json()) as { confirmation?: string };
    } catch {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_json' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    if (body.confirmation !== 'Ich verstehe') {
      return new Response(
        JSON.stringify({ ok: false, code: 'confirmation_required' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    interface MemberRow {
      id: number;
      email: string;
      display_name: string;
      last_export_at: Date | null;
    }
    const rows = await sql<MemberRow[]>`
      SELECT id, email, display_name, last_export_at
      FROM members WHERE id = ${session.memberId} LIMIT 1
    `;
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, code: 'not_found' }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      );
    }
    const member = rows[0];

    if (
      !member.last_export_at ||
      Date.now() - new Date(member.last_export_at).getTime() > THIRTY_DAYS_MS
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'export_required',
          message: 'Exportiere zuerst deine Daten, dann kannst du gehen.',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // 1. Send farewell first — order matters for tone-consistency.
    const firstName = member.display_name.split(' ')[0];
    try {
      await sendMail({
        to: member.email,
        subject: 'Du gehst in Frieden.',
        html: farewell({ name: firstName }),
      });
    } catch (err) {
      console.warn(
        '[account/leave] farewell mail send failed (continuing)',
        (err as Error).message,
      );
    }

    // 2. Best-effort: cancel Stripe at period end.
    try {
      const subRows = await sql<{ stripe_subscription_id: string | null }[]>`
        SELECT stripe_subscription_id FROM subscriptions
        WHERE member_id = ${session.memberId}
          AND status IN ('active', 'past_due')
        LIMIT 1
      `;
      const stripeSubId = subRows[0]?.stripe_subscription_id;
      if (stripeSubId) {
        const { getStripe } = await import('../../../../lib/communitas/stripe');
        await getStripe().subscriptions.update(stripeSubId, {
          cancel_at_period_end: true,
        });
      }
    } catch (err) {
      console.warn(
        '[account/leave] stripe cancel failed (continuing)',
        (err as Error).message,
      );
    }

    // 3. Hard-delete personal chained data.
    await sql`DELETE FROM cell_entries WHERE member_id = ${session.memberId}`;
    await sql`DELETE FROM kreis_messages WHERE author_id = ${session.memberId}`;
    await sql`
      UPDATE kreis_members SET left_at = now()
      WHERE member_id = ${session.memberId} AND left_at IS NULL
    `;
    await sql`DELETE FROM sessions WHERE member_id = ${session.memberId}`;
    await sql`DELETE FROM magic_links WHERE member_id = ${session.memberId}`;

    // 4. Mark member as left.
    await sql`
      UPDATE members
      SET left_on = current_date,
          cell_salt = NULL
      WHERE id = ${session.memberId}
    `;

    return new Response(
      JSON.stringify({
        ok: true,
        farewell: 'Wir tragen einander, ohne uns festzuhalten.',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[account/leave] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
