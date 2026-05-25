/**
 * Template 2 — Aufnahme-Annahme + Checkout
 *
 * Phase 5 wires the real Stripe checkout URL. Until then we communicate the
 * limitation explicitly: the body says "Der Zahlungslink folgt in den
 * nächsten Tagen." (See README in plan.md — Phase 5 is the Stripe phase.)
 */
import { communitasShell, paragraphs } from './_common.js';

export interface AcceptanceProps {
  name: string;
  /**
   * Optional. When present and non-empty, the body links to it. In Phase 3
   * (US1) callers do not pass it; we render the "Zahlungslink folgt" notice.
   */
  checkout_url?: string;
}

export default function acceptance(props: Record<string, unknown>): string {
  const p = props as unknown as AcceptanceProps;
  const url = (p.checkout_url ?? '').trim();
  const linkBlock = url
    ? `Der nächste Schritt ist die Verbindlichkeit: wähle deine Stufe und schließe
sie ab. Dieser Link gilt sieben Tage:

${url}`
    : `Der nächste Schritt ist die Verbindlichkeit: wähle deine Stufe und schließe
sie ab. Der Zahlungslink folgt in den nächsten Tagen.`;

  const body = `Liebe(r) ${p.name},

wir haben dein Gespräch gelesen und freuen uns, dich in die Versammlung
aufzunehmen.

${linkBlock}

— Communitas Basis: €960 / Jahr
— Communitas Voll: €3.600 / Jahr

Sobald die Verbindlichkeit getragen ist, beginnt am nächsten Morgen das
Cotidianum.

Wiederkehr ist alles.

In Stille,
Tobias`;

  return communitasShell(paragraphs(body));
}
