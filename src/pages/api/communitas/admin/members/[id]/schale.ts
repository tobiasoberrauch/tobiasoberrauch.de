/**
 * PATCH /api/communitas/admin/members/[id]/schale
 *
 * Phase 8 / T110 — Schwellenritus (Spec FR-021, FR-022).
 *
 * Only Companions or the Founder may move a member to a new Schale.
 * Body:
 *   {
 *     new_schale_key:    one of the seven keys,
 *     transition_days:   integer 3..7,
 *     transition_letter: 50..2000 chars (the companion writes it personally)
 *   }
 *
 * Side effects:
 *   - members row updated (current_schale_key, schale_set_by, schale_set_at,
 *     in_threshold_until = today + transition_days)
 *   - one email to the member with: old/new Schale, days, the companion's
 *     letter, and a single verse from the new schale's tradition.
 *
 * The morning-anchor cron already honours `in_threshold_until` and switches
 * to verse-only sending during the threshold window (see cron/morning.ts).
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../../../lib/communitas/auth';
import { sendMail } from '../../../../../../lib/communitas/mailer';
import thresholdTransition from '../../../../../../lib/communitas/email-templates/threshold-transition';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const SCHALE_KEYS = [
  'speculum',
  'silentium',
  'rota',
  'velum',
  'logos',
  'vox',
  'vestigium',
] as const;

type SchaleKey = (typeof SCHALE_KEYS)[number];

function isSchaleKey(v: unknown): v is SchaleKey {
  return typeof v === 'string' && (SCHALE_KEYS as readonly string[]).includes(v);
}

/**
 * One representative verse per Schale, drawn from the tradition the inner
 * room points at. Kept short and sober. The Begleiter may override by
 * inserting a different verse into the transition letter; this is only the
 * default the email template uses if the letter doesn't already carry one.
 */
const SCHALE_VERSES: Record<SchaleKey, string> = {
  speculum: '„Erkenne dich selbst." — Inschrift, Tempel von Delphi',
  silentium: '„Bleibe sitzen im stillen Raum." — Wüstenväter',
  rota: '„Was war, das wird sein; und was geschehen ist, das wird wieder geschehen." — Kohelet 1,9',
  velum: '„Die Wahrheit wird euch frei machen." — Johannes 8,32',
  logos: '„Im Anfang war das Wort." — Johannes 1,1',
  vox: '„Sprich, denn dein Knecht hört." — 1. Samuel 3,10',
  vestigium: '„Wir gehen alle der Spur nach, die wir nicht selbst gelegt haben." — Augustinus',
};

interface PatchBody {
  new_schale_key: SchaleKey;
  transition_days: number;
  transition_letter: string;
}

function validate(raw: unknown): PatchBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isSchaleKey(r.new_schale_key)) return null;
  const days = Number(r.transition_days);
  if (!Number.isInteger(days) || days < 3 || days > 7) return null;
  const letter = typeof r.transition_letter === 'string' ? r.transition_letter : '';
  if (letter.length < 50 || letter.length > 2000) return null;
  return {
    new_schale_key: r.new_schale_key,
    transition_days: days,
    transition_letter: letter,
  };
}

export const PATCH: APIRoute = async ({ request, params }) => {
  let callerId: number;
  try {
    const s = await requireCompanion(request);
    callerId = s.memberId;
  } catch (err) {
    if (err instanceof AuthError) {
      return json(err.status, {
        ok: false,
        code: err.status === 401 ? 'unauthorized' : 'forbidden',
      });
    }
    return json(401, { ok: false, code: 'unauthorized' });
  }

  const memberId = Number(params.id);
  if (!Number.isFinite(memberId) || memberId <= 0) {
    return json(400, { ok: false, code: 'validation_error', field: 'id' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: 'validation_error', field: 'body' });
  }
  const v = validate(body);
  if (!v) return json(400, { ok: false, code: 'validation_error' });

  // Load the target member with current schale + the German name of both
  // current and new schales in a single query.
  const rows = await sql<
    {
      id: number;
      email: string;
      display_name: string;
      old_german: string;
      new_german: string;
    }[]
  >`
    SELECT
      m.id, m.email, m.display_name,
      s_old.german_name AS old_german,
      s_new.german_name AS new_german
    FROM members m
    JOIN schales s_old ON s_old.key = m.current_schale_key
    JOIN schales s_new ON s_new.key = ${v.new_schale_key}
    WHERE m.id = ${memberId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    return json(404, { ok: false, code: 'not_found' });
  }
  const target = rows[0];

  await sql`
    UPDATE members
    SET current_schale_key = ${v.new_schale_key},
        schale_set_by = ${callerId},
        schale_set_at = now(),
        in_threshold_until = current_date + ${v.transition_days} * interval '1 day'
    WHERE id = ${memberId}
  `;

  const verse = SCHALE_VERSES[v.new_schale_key];
  try {
    await sendMail({
      to: target.email,
      subject: `Schwelle — von ${target.old_german} in ${target.new_german}.`,
      html: thresholdTransition({
        name: target.display_name,
        old_schale_de: target.old_german,
        new_schale_de: target.new_german,
        transition_days: v.transition_days,
        transition_letter: v.transition_letter,
        verse,
      }),
    });
  } catch (err) {
    console.warn(
      '[admin/schale] transition mail failed for member_id=',
      memberId,
      (err as Error).message,
    );
  }

  return json(200, {
    ok: true,
    member_id: memberId,
    new_schale_key: v.new_schale_key,
    in_threshold_for_days: v.transition_days,
  });
};
