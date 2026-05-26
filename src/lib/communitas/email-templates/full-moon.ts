/**
 * Template 8 — Vollmond-Brief.
 *
 * Monthly long-form letter. The body is Markdown-rendered (via the
 * Communitas-internal renderer); the footer carries the Spec FR-019 renewal
 * question with the one-click cancel link (HMAC token via cancel-token.ts).
 *
 * The signature at the bottom is the author's first name only.
 * Subject line format: "Vollmond — {Monat}." — Tobias' name is NEVER in the
 * subject (Anti-Personenkult, FR-029/FR-030).
 */
import { communitasShell, escapeHtml } from './_common.js';
import { renderMarkdown } from '../render-md.js';

export interface FullMoonProps {
  author_first_name: string;
  body_markdown: string;
  full_moon_date_label: string; // e.g. "Vollmond, 25. Mai 2026"
  one_click_cancel_url: string;
}

const GERMAN_MONTHS: readonly string[] = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/**
 * Compute the German month name from a Date. Exported so the send endpoint
 * can build the subject line consistently.
 */
export function germanMonth(d: Date): string {
  return GERMAN_MONTHS[d.getUTCMonth()] ?? '';
}

export default function fullMoon(props: Record<string, unknown>): string {
  const p = props as unknown as FullMoonProps;
  const bodyHtml = renderMarkdown(p.body_markdown ?? '');
  const author = escapeHtml(p.author_first_name);
  const dateLabel = escapeHtml(p.full_moon_date_label);

  const cancelUrl = p.one_click_cancel_url;

  // The renewal footer is part of the letter itself, not just the common
  // footer — Spec FR-019. Sober wording.
  const renewalBlock = `
    <hr style="border: 0; border-top: 1px solid #d6d3d1; margin: 2rem 0 1rem;" />
    <p style="font-style: italic; margin: 0 0 0.5em;">Bleibe ich? Gehe ich?</p>
    <p style="margin: 0 0 1em;">
      Wenn du gehen willst, klicke hier — einmal genügt:<br/>
      <a href="${cancelUrl}" style="color: #1c1917;">${cancelUrl}</a>
    </p>
    <p style="margin: 0 0 1em;">Wenn du bleibst, musst du nichts tun.</p>
  `;

  const inner = `
    <p style="color: #78716c; font-size: 0.9rem; margin: 0 0 1.5rem;">${dateLabel}</p>
    ${bodyHtml}
    <p style="margin: 2rem 0 0;">${author}</p>
    ${renewalBlock}
  `;
  return communitasShell(inner);
}
