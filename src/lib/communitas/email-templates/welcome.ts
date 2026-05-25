/**
 * Template 13 — „Du bist da."
 *
 * Trigger: Stripe `checkout.session.completed`. Wording per
 * contracts/email-templates.md §13; do not paraphrase.
 */
import { communitasShell, paragraphs } from './_common.js';

export interface WelcomeProps {
  name: string;
}

export default function welcome(props: Record<string, unknown>): string {
  const p = props as unknown as WelcomeProps;
  const body = `${p.name},

du bist da. Willkommen.

Morgen früh — zwischen sechs und acht — beginnt das Cotidianum.

Bei jedem Vollmond fragt diese Versammlung dich: Bleibe ich? Gehe ich?
Du musst nicht antworten. Aber niemand kommt um die Frage herum.

Tobias`;

  return communitasShell(paragraphs(body));
}
