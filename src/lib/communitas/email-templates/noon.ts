/**
 * Template 6 — Mittagsinnehalten.
 *
 * Pure link to a static MP3 on the same domain. No iFrame, no player embed.
 * Wording per contracts/email-templates.md §6.
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface NoonProps {
  audio_url: string;
}

export default function noon(props: Record<string, unknown>): string {
  const p = props as unknown as NoonProps;
  const safeUrl = escapeHtml(p.audio_url);
  const inner = `
    <p style="margin: 0 0 1em;">Ein Augenblick.</p>
    <p style="margin: 0 0 1em;">Spur, fünf bis acht Minuten:</p>
    <p style="margin: 0 0 1em;"><a href="${safeUrl}" style="color: #1c1917; text-decoration: underline; text-underline-offset: 0.2em;">${safeUrl}</a></p>
    <p style="margin: 0 0 1em; color: #78716c;">(Wenn du das Mittagsmahl in Ruhe nehmen kannst, nimm es. Wenn nicht, genügt ein Augenblick.)</p>
  `;
  return communitasShell(inner);
}
