/**
 * Template 8 — Kreis-Einführung („Du bist in einen Kreis aufgenommen worden.")
 *
 * Phase 7 / US5 / T101.
 *
 * Sent individually to each member of a newly-created Briefkreis (and to
 * a single new member when they are added later, with the read-forward-only
 * variant). Carries the 6-word code that the recipient types into the
 * browser to derive the kreis symkey. The server never stores the code.
 *
 * No tracking pixels, no images, plain Georgia serif body.
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface KreisIntroductionProps {
  recipient_name: string;
  kreis_name: string;
  introductory_question: string;
  other_members_first_names: string[];
  code_six_words: string; // already joined with single spaces
  kreis_url: string;
  /** When set, this member is joining an existing kreis — append the
   *  read-forward-only paragraph instead of the "wir beginnen gemeinsam"
   *  wording. */
  read_forward_only?: boolean;
}

function joinNames(names: string[]): string {
  const clean = names.filter((n) => n && n.trim().length > 0);
  if (clean.length === 0) return '(niemand sonst — du bist alleine)';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} und ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')} und ${clean[clean.length - 1]}`;
}

export default function kreisIntroduction(
  props: Record<string, unknown>,
): string {
  const p = props as unknown as KreisIntroductionProps;
  const recipient = escapeHtml(p.recipient_name);
  const kreisName = escapeHtml(p.kreis_name);
  const question = escapeHtml(p.introductory_question);
  const others = escapeHtml(joinNames(p.other_members_first_names));
  const code = escapeHtml(p.code_six_words);
  const url = escapeHtml(p.kreis_url);

  const continuityLine = p.read_forward_only
    ? `<p style="margin: 0 0 1em;">Die Briefe, die vor deinem Eintritt geschrieben wurden, gehören den anderen — du startest mit uns ab jetzt.</p>`
    : '';

  const codeBlock = `
    <p style="margin: 1.5em 0 0;">Diesen sechs-Wort-Code brauchst du, um die Briefe zu entschlüsseln. Schreibe ihn in deinen Browser unter:</p>
    <p style="margin: 0.5em 0 1em;"><a href="${url}" style="color: #1c1917;">${url}</a></p>
    <p style="margin: 0 0 1em; padding: 0.9em 1em; border: 1px solid #d6d3d1; background: #fafaf9; font-family: 'Courier New', Courier, monospace; font-size: 1.05rem; letter-spacing: 0.02em;">${code}</p>
  `;

  const body = `
    <p style="margin: 0 0 1em;">${recipient},</p>
    <p style="margin: 0 0 1em;">du bist in einen Kreis aufgenommen worden.</p>
    <p style="margin: 0 0 1em;">Der Kreis heißt: <strong>${kreisName}</strong>.<br/>Außer dir gehören dazu: ${others}.</p>
    <p style="margin: 1em 0 0;">Die erste Frage des Kreises, die euch verbindet:</p>
    <blockquote style="margin: 0.5em 0 1em 0; padding: 0 0 0 1em; border-left: 2px solid #78716c; color: #44403c; font-style: italic;">${question}</blockquote>
    ${codeBlock}
    <p style="margin: 0 0 1em;">Bewahre den Code an einem Ort, den nur du kennst. Tobias oder die Begleiter speichern ihn nicht und können dir keinen Ersatz schicken — nur einen neuen Kreis-Code erzeugen, womit aber alle bisherigen Briefe nicht mehr lesbar werden.</p>
    ${continuityLine}
    <p style="margin: 0 0 1em;">Schreibe einander einmal im Monat. Kurz oder lang, wie es kommt.</p>
    <p style="margin: 2em 0 0;">In Stille,<br/>Tobias</p>
  `;

  return communitasShell(body);
}
