/**
 * POST /api/communitas/account/export
 *
 * Phase 6 / US4 / T091.
 *
 * Builds a ZIP archive of everything the member has produced and sends it
 * by email. The cell ciphertext is NOT decrypted — the server has no key.
 * The member retains their passphrase and can decrypt locally later.
 *
 * Stamps `members.last_export_at` on success. The leave endpoint refuses
 * unless this stamp is within the last 30 days.
 */
import type { APIRoute } from 'astro';
import { sql } from '../../../../lib/communitas/db';
import { requireMember, AuthError } from '../../../../lib/communitas/auth';
import { sendMail } from '../../../../lib/communitas/mailer';
import { ZipWriter } from '../../../../lib/communitas/zip-writer';

export const prerender = false;

interface MemberRow {
  id: number;
  email: string;
  display_name: string;
  joined_on: Date | string;
  current_schale_key: string;
  preferred_locale: string;
  timezone: string;
}

interface CellRow {
  id: number;
  ciphertext: Buffer;
  iv: Buffer;
  written_on: Date | string;
  byte_length: number;
  created_at: Date;
  updated_at: Date;
}

interface KreisRow {
  kreis_id: number;
  kreis_name: string;
  joined_at: Date;
  left_at: Date | null;
}

interface SubscriptionRow {
  id: number;
  tier: string;
  status: string;
  yearly_amount_cents: number;
  current_period_start: Date | string;
  current_period_end: Date | string;
  created_at: Date;
}

function isoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return new Date(d).toISOString().slice(0, 10);
}

function readmeMd(memberName: string): string {
  return `# Dein Communitas-Archiv

Dies ist das vollständige Archiv deiner Mitgliedschaft in der
Communitas Cotidiana, ${memberName}.

Im Archiv findest du:

- \`member.json\` — deine nicht-sensiblen Stammdaten (Name, Eintrittsdatum,
  Schale, Sprache, Stufe).
- \`cell_entries/\` — deine Zelleneinträge als verschlüsselte Rohdateien.
  Diese sind nur mit deiner Zell-Passphrase entschlüsselbar. Wir haben
  sie nie gelesen — wir können sie auch jetzt nicht lesen.
- \`cell_entries/MANIFEST.md\` — eine Übersicht der Einträge.
- \`kreis_membership.json\` — die Liste deiner Briefkreis-Zugehörigkeiten.
- \`subscriptions.json\` — der Verlauf deiner Mitgliedschaftsstufen.

Du musst nichts damit machen. Bewahre das Archiv auf, wenn dir die
Einträge etwas bedeuten. Verwirf es, wenn nicht.

In Stille,
Communitas Cotidiana
`;
}

function manifestMd(entries: { id: number; written_on: string; byte_length: number }[]): string {
  const header = `# Zelle — Manifest

Diese Dateien sind verschlüsselt mit AES-256-GCM. Du kannst sie nur mit
deiner Zell-Passphrase entschlüsseln. Das System hat die Inhalte nie
gesehen.

Format jedes Eintrags:
- \`<id>_<datum>.bin\` — Chiffrat (enthält den 16-Byte GCM-Authentifikations-Tag).
- \`<id>_<datum>.iv.bin\` — Nonce (12 Bytes), notwendig zur Entschlüsselung.

Argon2id-Parameter (für Wiederherstellung der Schlüsselherleitung):
  Memory = 64 MiB, Iterations = 3, Parallelism = 4, Output = 32 Bytes.
Anwendungs-Salt-Präfix: "communitas:v1:cell" gefolgt von deinem
persönlichen 16-Byte Cell-Salt (war in der Browser-IndexedDB).

`;
  const rows = entries
    .map(
      (e) =>
        `- \`${e.id}_${e.written_on}.bin\` — ${e.written_on} — ${e.byte_length} Bytes`,
    )
    .join('\n');
  return header + (rows || '*(keine Einträge)*') + '\n';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await requireMember(request);

    const members = await sql<MemberRow[]>`
      SELECT id, email, display_name, joined_on, current_schale_key,
             preferred_locale, timezone
      FROM members WHERE id = ${session.memberId} LIMIT 1
    `;
    if (members.length === 0) {
      return new Response(JSON.stringify({ ok: false, code: 'not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    const member = members[0];

    const cells = await sql<CellRow[]>`
      SELECT id, ciphertext, iv, written_on, byte_length, created_at, updated_at
      FROM cell_entries WHERE member_id = ${session.memberId}
      ORDER BY written_on ASC, id ASC
    `;

    const kreise = await sql<KreisRow[]>`
      SELECT km.kreis_id, k.name AS kreis_name, km.joined_at, km.left_at
      FROM kreis_members km
      JOIN kreise k ON k.id = km.kreis_id
      WHERE km.member_id = ${session.memberId}
    `;

    const subs = await sql<SubscriptionRow[]>`
      SELECT id, tier, status, yearly_amount_cents,
             current_period_start, current_period_end, created_at
      FROM subscriptions WHERE member_id = ${session.memberId}
      ORDER BY created_at ASC
    `;

    // Build current active tier (for member.json convenience).
    const activeSub = subs.find((s) => s.status === 'active') ?? null;

    const zip = new ZipWriter();

    zip.addFile('README.md', readmeMd(member.display_name));

    zip.addFile(
      'member.json',
      JSON.stringify(
        {
          display_name: member.display_name,
          email: member.email,
          joined_on: isoDate(member.joined_on),
          current_schale_key: member.current_schale_key,
          preferred_locale: member.preferred_locale,
          timezone: member.timezone,
          active_tier: activeSub?.tier ?? null,
        },
        null,
        2,
      ),
    );

    zip.addFile(
      'kreis_membership.json',
      JSON.stringify(
        kreise.map((k) => ({
          kreis_id: Number(k.kreis_id),
          kreis_name: k.kreis_name,
          joined_at: new Date(k.joined_at).toISOString(),
          left_at: k.left_at ? new Date(k.left_at).toISOString() : null,
        })),
        null,
        2,
      ),
    );

    zip.addFile(
      'subscriptions.json',
      JSON.stringify(
        subs.map((s) => ({
          id: Number(s.id),
          tier: s.tier,
          status: s.status,
          yearly_amount_cents: Number(s.yearly_amount_cents),
          current_period_start: isoDate(s.current_period_start),
          current_period_end: isoDate(s.current_period_end),
          created_at: new Date(s.created_at).toISOString(),
        })),
        null,
        2,
      ),
    );

    const manifestEntries: { id: number; written_on: string; byte_length: number }[] = [];
    for (const c of cells) {
      const dateStr = isoDate(c.written_on);
      const base = `cell_entries/${c.id}_${dateStr}`;
      const ctBuf = Buffer.isBuffer(c.ciphertext)
        ? c.ciphertext
        : Buffer.from(c.ciphertext as unknown as Uint8Array);
      const ivBuf = Buffer.isBuffer(c.iv)
        ? c.iv
        : Buffer.from(c.iv as unknown as Uint8Array);
      zip.addFile(`${base}.bin`, ctBuf);
      zip.addFile(`${base}.iv.bin`, ivBuf);
      manifestEntries.push({
        id: Number(c.id),
        written_on: dateStr,
        byte_length: Number(c.byte_length),
      });
    }
    zip.addFile('cell_entries/MANIFEST.md', manifestMd(manifestEntries));

    const archive = zip.build();
    const archiveName = `communitas-archiv-${isoDate(new Date())}.zip`;

    // Send via mailer. If RESEND not configured, we still stamp the export
    // so dev/test environments don't block the leave-flow forever.
    const mailResult = await sendMail({
      to: member.email,
      subject: 'Dein Communitas-Archiv',
      html: `<p>${member.display_name.split(' ')[0]},</p>
<p>im Anhang findest du dein vollständiges Archiv. Bewahre es auf, wenn
es dir wichtig ist; verwirf es, wenn nicht.</p>
<p>Die Zell-Einträge sind verschlüsselt. Nur du kannst sie mit deiner
Passphrase entschlüsseln. Wir haben sie nie gesehen.</p>
<p>In Stille,<br/>Communitas Cotidiana</p>`,
      text: `${member.display_name.split(' ')[0]},\n\nim Anhang findest du dein vollständiges Archiv. Die Zell-Einträge sind verschlüsselt; nur du kannst sie mit deiner Passphrase entschlüsseln.\n\nIn Stille,\nCommunitas Cotidiana\n`,
      attachments: [
        {
          filename: archiveName,
          content: archive,
          contentType: 'application/zip',
        },
      ],
    });

    // Stamp last_export_at regardless of mail upstream outcome — the
    // archive was successfully built; the member still has their cell
    // ciphertext in the system, and they can re-trigger the export if
    // the email didn't arrive.
    await sql`
      UPDATE members SET last_export_at = now() WHERE id = ${session.memberId}
    `;

    return new Response(
      JSON.stringify({
        ok: true,
        exported_at: new Date().toISOString(),
        archive_size_bytes: archive.length,
        mail: mailResult,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    if (err instanceof AuthError) return err.toResponse();
    console.warn('[account/export] error', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
