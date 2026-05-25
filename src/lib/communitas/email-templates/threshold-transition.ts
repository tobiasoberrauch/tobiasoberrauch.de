/**
 * Schwellenritus — Begleiter-Brief beim Schalen-Übergang (FR-022).
 *
 * Sent when a companion changes a member's `current_schale_key`. Includes:
 *  - the named transition (von X in Y)
 *  - the companion's personally written transition letter (50–2000 chars)
 *  - one verse from the new schale's tradition (caller picks)
 *
 * Three to seven days of "Innehalten" follow — during this window the
 * morning cron sends a verse-only anchor (see cron/morning.ts).
 */
import { communitasShell, escapeHtml, paragraphs } from './_common.js';

export interface ThresholdTransitionProps {
  name: string;
  old_schale_de: string;
  new_schale_de: string;
  transition_days: number;
  transition_letter: string;
  verse: string;
}

export default function thresholdTransition(
  props: Record<string, unknown>,
): string {
  const p = props as unknown as ThresholdTransitionProps;
  const name = escapeHtml(p.name);
  const oldS = escapeHtml(p.old_schale_de);
  const newS = escapeHtml(p.new_schale_de);
  const days = Math.max(3, Math.min(7, Number(p.transition_days) || 3));
  const verseHtml = paragraphs(p.verse ?? '');
  const letterHtml = paragraphs(p.transition_letter ?? '');

  const inner = `
    <p style="margin: 0 0 1em;">${name},</p>
    <p style="margin: 0 0 1em;">
      du gehst von <strong>${oldS}</strong> in <strong>${newS}</strong>.
    </p>
    <p style="margin: 0 0 1em;">${days} Tage Innehalten.</p>
    <hr style="border: 0; border-top: 1px solid #d6d3d1; margin: 2rem 0 1rem;" />
    ${letterHtml}
    <hr style="border: 0; border-top: 1px solid #d6d3d1; margin: 2rem 0 1rem;" />
    <p style="font-style: italic; margin: 0 0 0.5em;">Aus der Tradition:</p>
    ${verseHtml}
  `;
  return communitasShell(inner);
}
