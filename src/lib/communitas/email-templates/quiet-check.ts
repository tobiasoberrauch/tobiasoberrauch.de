/**
 * Template 9 — Sanfte Wiederfrage (3-Monats-Schweige).
 *
 * Wording is EXACT per contracts/email-templates.md §9 and Spec AS Story 2:
 * „Wir denken an dich. Wenn du gehen willst, gehe in Frieden. Wenn du bleiben
 * willst, bist du da." Do not paraphrase.
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface QuietCheckProps {
  name: string;
}

export default function quietCheck(props: Record<string, unknown>): string {
  const p = props as unknown as QuietCheckProps;
  const safeName = escapeHtml(p.name);
  const inner = `
    <p style="margin: 0 0 1em;">${safeName},</p>
    <p style="margin: 0 0 1em;">drei Monate sind vergangen, ohne dass wir gehört oder gesehen haben, wo du bist.</p>
    <p style="margin: 0 0 1em;">Das ist keine Mahnung. Es ist eine schlichte Frage.</p>
    <p style="margin: 0 0 1em;">Wenn du gehen willst, gehe in Frieden. Wenn du bleiben willst, bist du da.</p>
    <p style="margin: 0 0 1em;">Du musst nicht antworten.</p>
    <p style="margin: 0 0 1em;">Tobias</p>
  `;
  return communitasShell(inner);
}
