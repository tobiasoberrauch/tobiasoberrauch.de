/**
 * Template 5 — Morgensammlung (Anker).
 *
 * Black on white, no images, no buttons. Six lines or fewer in the visible
 * body (Spec FR-010). The optional `verse` is the first line(s) of the
 * Markdown anchor file (e.g. a Rilke citation); the `question` is the
 * Tagesfrage. `weekday_label` and `date_label` form the discreet trailing
 * attribution „— Spiegel (Montag, 25. Mai)".
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface MorningProps {
  name: string;
  verse?: string;
  question: string;
  weekday_label: string;
  date_label: string;
}

export default function morning(props: Record<string, unknown>): string {
  const p = props as unknown as MorningProps;
  const versePart = p.verse && p.verse.trim().length > 0
    ? `<p style="margin: 0 0 1.5em; font-style: italic; color: #1c1917;">${escapeHtml(p.verse).replace(/\n/g, '<br/>')}</p>`
    : '';
  const inner = `
    ${versePart}
    <p style="margin: 0 0 1.5em;">${escapeHtml(p.question)}</p>
    <p style="margin: 0; color: #78716c; font-style: italic;">— ${escapeHtml(p.weekday_label)} (${escapeHtml(p.date_label)})</p>
  `;
  return communitasShell(inner);
}
