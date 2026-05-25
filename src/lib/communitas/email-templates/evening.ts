/**
 * Template 7 — Abendrückblick.
 *
 * The three fixed questions (Spec FR-012). For Voll/InnerCircle a discreet
 * link to the Zelle is appended; Basis sees only the questions.
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface EveningProps {
  /** Only present for voll/inner_circle members. */
  cell_url?: string;
}

export default function evening(props: Record<string, unknown>): string {
  const p = props as unknown as EveningProps;
  const cellPart = p.cell_url && p.cell_url.trim().length > 0
    ? `
      <p style="margin: 2em 0 0.5em; color: #78716c;">(Wenn du schreiben möchtest:)</p>
      <p style="margin: 0;"><a href="${escapeHtml(p.cell_url)}" style="color: #1c1917; text-decoration: underline; text-underline-offset: 0.2em;">${escapeHtml(p.cell_url)}</a></p>
    `
    : '';
  const inner = `
    <p style="margin: 0 0 1.5em;">Wo war ich heute wach?</p>
    <p style="margin: 0 0 1.5em;">Wo war ich heute schlafend?</p>
    <p style="margin: 0 0 1.5em;">Wofür danke ich?</p>
    ${cellPart}
  `;
  return communitasShell(inner);
}
