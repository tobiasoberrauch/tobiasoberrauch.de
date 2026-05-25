/**
 * Template 12 — Brief an sich selbst, Rückzustellung (1 Jahr später).
 *
 * Server reads, sends, forgets. No caching of the decrypted plaintext.
 * The decrypted content lives only in the rendered HTML and the SMTP payload.
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface ReturnLetterProps {
  name: string;
  original_date: string;            // human-readable, German format
  decrypted_letter_content: string; // plaintext
}

export default function returnLetter(props: Record<string, unknown>): string {
  const p = props as unknown as ReturnLetterProps;
  const safeLetter = escapeHtml(p.decrypted_letter_content).replace(/\n/g, '<br/>');

  const inner = `
    <p style="margin: 0 0 1em;">${escapeHtml(p.name)},</p>
    <p style="margin: 0 0 1em;">vor einem Jahr — am ${escapeHtml(
      p.original_date,
    )} — hast du dir selbst geschrieben.</p>
    <p style="margin: 0 0 1em;">Hier ist der Brief, ungeöffnet von uns:</p>
    <p style="margin: 0 0 1em; font-style: italic; color: #78716c;">—— BEGIN BRIEF ——</p>
    <div style="margin: 0 0 1em; padding: 1em; border-left: 2px solid #d6d3d1; white-space: pre-wrap;">
      ${safeLetter}
    </div>
    <p style="margin: 0 0 1em; font-style: italic; color: #78716c;">—— ENDE BRIEF ——</p>
    <p style="margin: 0 0 1em;">Was sagt er dir heute?</p>
  `;

  return communitasShell(inner);
}
