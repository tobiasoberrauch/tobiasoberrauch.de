/**
 * Template 4 — Magic-Link.
 *
 * Wording is fixed by contracts/email-templates.md §4; do not paraphrase.
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface MagicLinkProps {
  name: string;
  magic_link_url: string;
}

export default function magicLink(props: Record<string, unknown>): string {
  const p = props as unknown as MagicLinkProps;
  const safeName = escapeHtml(p.name);
  const safeUrl = escapeHtml(p.magic_link_url);

  const inner = `
    <p style="margin: 0 0 1em;">${safeName},</p>
    <p style="margin: 0 0 1em;">dein Anmelde-Link, gültig zehn Minuten:</p>
    <p style="margin: 0 0 1em;"><a href="${safeUrl}" style="color: #1c1917; text-decoration: underline; text-underline-offset: 0.2em;">${safeUrl}</a></p>
    <p style="margin: 0 0 1em;">Wenn du diese Mail nicht angefordert hast, ignoriere sie.</p>
  `;

  return communitasShell(inner);
}
