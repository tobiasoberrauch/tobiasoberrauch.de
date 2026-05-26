/**
 * POST /api/communitas/admin/vollmond
 *
 * Phase 8 / T109.
 *
 * Creates a draft full-moon letter (`full_moon_letters` row, sent_at IS NULL).
 * Enforces the Vier-Stimmen-Constraint (FR-029):
 *   - Of the last 12 sent letters, the founder (Tobias) must have authored
 *     strictly fewer than half (i.e. <= 6). If creating this letter under
 *     the founder's name would push that share to 7/13, we refuse.
 *
 * Companion-only. Body:
 *   { full_moon_date: 'YYYY-MM-DD', author_id: number, body_markdown: string }
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../lib/communitas/auth';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface CreateBody {
  full_moon_date: string;
  author_id: number;
  body_markdown: string;
}

function validate(raw: unknown): CreateBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const date = typeof r.full_moon_date === 'string' ? r.full_moon_date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const authorId = Number(r.author_id);
  if (!Number.isFinite(authorId) || authorId <= 0) return null;
  const body = typeof r.body_markdown === 'string' ? r.body_markdown : '';
  if (body.length < 100 || body.length > 50000) return null;
  return { full_moon_date: date, author_id: authorId, body_markdown: body };
}

/**
 * Returns true if assigning the next letter to `authorId` (who has role
 * `authorRole`) would push the founder's share of the last 12 letters to
 * 50 % or more (i.e. >= 7 out of 13). If fewer than 12 prior letters exist,
 * the constraint is not yet binding and the function returns false.
 */
export async function wouldViolateFourVoices(
  authorRole: 'founder' | 'companion',
): Promise<{ violates: boolean; foundersShare: number; total: number }> {
  const rows = await sql<{ role: string }[]>`
    SELECT m.role
    FROM full_moon_letters fml
    JOIN members m ON m.id = fml.author_id
    WHERE fml.sent_at IS NOT NULL
    ORDER BY fml.sent_at DESC
    LIMIT 12
  `;
  const total = rows.length;
  const founderCount = rows.filter((r) => r.role === 'founder').length;
  if (total < 12) {
    return { violates: false, foundersShare: founderCount, total };
  }
  if (authorRole !== 'founder') {
    return { violates: false, foundersShare: founderCount, total };
  }
  // Adding one more founder letter → (founderCount + 1) / 13.
  // Violates when share >= 50 % → founderCount + 1 >= 7 → founderCount >= 6.
  // Block on exactly the boundary too — spec wording: „strictly less than 50 %".
  return {
    violates: founderCount + 1 >= 7,
    foundersShare: founderCount,
    total,
  };
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

  const authorRows = await sql<{ id: number; role: string }[]>`
    SELECT id, role FROM members
    WHERE id = ${v.author_id} AND role IN ('founder', 'companion')
    LIMIT 1
  `;
  if (authorRows.length === 0) {
    return json(
      400,
      { ok: false, code: 'validation_error', field: 'author_id' },
    );
  }
  const authorRole = authorRows[0].role as 'founder' | 'companion';

  const check = await wouldViolateFourVoices(authorRole);
  if (check.violates) {
    return json(400, {
      ok: false,
      code: 'four_voices_violation',
      detail: `Tobias hat ${check.foundersShare} der letzten ${check.total} Briefe geschrieben. Eine andere Stimme ist dran.`,
    });
  }

  // INSERT — UNIQUE constraint on full_moon_date prevents duplicates.
  let insertedId: number;
  try {
    const inserted = await sql<{ id: number }[]>`
      INSERT INTO full_moon_letters (full_moon_date, author_id, body_markdown)
      VALUES (${v.full_moon_date}::date, ${v.author_id}, ${v.body_markdown})
      RETURNING id
    `;
    insertedId = Number(inserted[0].id);
  } catch (err) {
    return json(400, {
      ok: false,
      code: 'validation_error',
      detail: (err as Error).message,
    });
  }

  return json(200, { ok: true, id: insertedId });
};
