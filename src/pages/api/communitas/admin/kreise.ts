/**
 * POST /api/communitas/admin/kreise — Phase 7 / US5 / T095.
 *
 * Creates a new Briefkreis. Companion/founder only.
 *
 * Flow:
 *   1. Validate name, introductory_question, member_ids (3–5 unique members,
 *      all active, all on tier 'voll' or 'inner_circle').
 *   2. Generate per-kreis Argon2id salt (16 bytes, persisted).
 *   3. Generate 6-word code (NOT persisted — only embedded in the
 *      individual introduction mails).
 *   4. Insert kreise + kreis_members rows in a single transaction.
 *   5. Send one introduction mail per member (other members' first names
 *      visible — emails are NOT shared).
 *
 * Server-blindness: we never hash or otherwise verify the code on the
 * server. The first decrypted message implicitly validates that all
 * members typed the same code.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireCompanion, AuthError } from '../../../../lib/communitas/auth';
import { sendBatched } from '../../../../lib/communitas/mailer';
import {
  generateKreisCode,
  generateKreisSalt,
} from '../../../../lib/communitas/kreis-crypto';
import kreisIntroduction from '../../../../lib/communitas/email-templates/kreis-introduction';

export const prerender = false;

const SITE_URL = process.env.SITE_URL ?? 'https://tobiasoberrauch.de';
const MIN_MEMBERS = 3;
const MAX_MEMBERS = 5;

interface CreateBody {
  name?: string;
  introductory_question?: string;
  member_ids?: number[];
}

function jsonError(status: number, code: string, detail?: string): Response {
  return new Response(JSON.stringify({ ok: false, code, detail }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

interface MemberRow {
  id: number;
  email: string;
  display_name: string;
  tier: 'basis' | 'voll' | 'inner_circle' | null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await requireCompanion(request);

    let body: CreateBody;
    try {
      body = (await request.json()) as CreateBody;
    } catch {
      return jsonError(400, 'invalid_json');
    }

    const name = (body.name ?? '').trim();
    const question = (body.introductory_question ?? '').trim();
    const memberIdsRaw = body.member_ids ?? [];

    if (name.length < 1 || name.length > 200) {
      return jsonError(400, 'invalid_name');
    }
    if (question.length < 1 || question.length > 500) {
      return jsonError(400, 'invalid_question');
    }
    if (
      !Array.isArray(memberIdsRaw) ||
      memberIdsRaw.length < MIN_MEMBERS ||
      memberIdsRaw.length > MAX_MEMBERS
    ) {
      return jsonError(400, 'invalid_member_count');
    }
    const memberIds: number[] = [];
    const seen = new Set<number>();
    for (const raw of memberIdsRaw) {
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0) {
        return jsonError(400, 'invalid_member_id');
      }
      if (seen.has(n)) {
        return jsonError(400, 'duplicate_member_id');
      }
      seen.add(n);
      memberIds.push(n);
    }

    // Resolve members + tier. Reject if any is missing, inactive, or on
    // 'basis' tier (kreise are voll + inner_circle only).
    const members = await sql<MemberRow[]>`
      SELECT
        m.id,
        m.email,
        m.display_name,
        (
          SELECT tier FROM subscriptions
          WHERE member_id = m.id
            AND status IN ('active', 'paused', 'scholarship')
          ORDER BY created_at DESC LIMIT 1
        ) AS tier
      FROM members m
      WHERE m.id = ANY(${memberIds})
        AND m.left_on IS NULL
        AND m.role IN ('member', 'companion', 'founder')
    `;
    if (members.length !== memberIds.length) {
      return jsonError(400, 'member_not_found');
    }
    for (const m of members) {
      if (m.tier !== 'voll' && m.tier !== 'inner_circle') {
        return jsonError(400, 'member_tier_insufficient', `member ${m.id}`);
      }
    }

    // Generate symkey material. The code is NEVER persisted; only the salt.
    const salt = generateKreisSalt();
    const codeWords = generateKreisCode();
    const codeJoined = codeWords.join(' ');

    // Transactional insert.
    let kreisId = 0;
    await sql.begin(async (tx) => {
      const ins = await tx<{ id: number }[]>`
        INSERT INTO kreise (name, introductory_question, created_by, symkey_salt)
        VALUES (${name}, ${question}, ${session.memberId}, ${salt})
        RETURNING id
      `;
      kreisId = Number(ins[0].id);
      for (const m of members) {
        await tx`
          INSERT INTO kreis_members (kreis_id, member_id)
          VALUES (${kreisId}, ${m.id})
        `;
      }
    });

    // Build & send introduction mails. Each member sees the OTHER members'
    // first names — never their email addresses.
    const firstName = (full: string): string =>
      full.split(/\s+/)[0] ?? full;
    const kreisUrl = `${SITE_URL}/communitas-mitglied/kreis/${kreisId}`;
    const mails = members.map((m) => {
      const others = members
        .filter((o) => o.id !== m.id)
        .map((o) => firstName(o.display_name));
      const html = kreisIntroduction({
        recipient_name: firstName(m.display_name),
        kreis_name: name,
        introductory_question: question,
        other_members_first_names: others,
        code_six_words: codeJoined,
        kreis_url: kreisUrl,
      });
      return {
        to: m.email,
        subject: 'Du bist in einen Kreis aufgenommen worden.',
        html,
      };
    });

    // Fire-and-forget batched send. We don't propagate per-recipient
    // failures to the response — the admin already has the kreis, and
    // a missing email can be re-sent via /rotate-code if needed.
    try {
      await sendBatched(mails);
    } catch (err) {
      console.warn('[admin/kreise POST] mail batch error', (err as Error).message);
    }

    return new Response(
      JSON.stringify({
        kreis_id: kreisId,
        member_count: members.length,
        code_displayed_in_emails: true,
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[admin/kreise POST] error', (err as Error).message);
    return jsonError(500, 'internal_error');
  }
};
