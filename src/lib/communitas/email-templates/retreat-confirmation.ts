/**
 * Retreat-Anmeldebestätigung.
 *
 * Sober, practical, no marketing tone. Sent after a member books a retreat
 * (either €0 for Inner Circle or after Stripe one-time payment succeeded).
 */
import { communitasShell, escapeHtml } from './_common.js';

export interface RetreatConfirmationProps {
  name: string;
  retreat_title: string;
  retreat_location: string;
  start_date_label: string; // e.g. "21. März 2026"
  end_date_label: string;
}

export default function retreatConfirmation(
  props: Record<string, unknown>,
): string {
  const p = props as unknown as RetreatConfirmationProps;
  const name = escapeHtml(p.name);
  const title = escapeHtml(p.retreat_title);
  const location = escapeHtml(p.retreat_location);
  const start = escapeHtml(p.start_date_label);
  const end = escapeHtml(p.end_date_label);

  const inner = `
    <p style="margin: 0 0 1em;">${name},</p>
    <p style="margin: 0 0 1em;">
      wir freuen uns auf dich am ${start} bis ${end} in ${location}.
    </p>
    <p style="margin: 0 0 1em;"><strong>${title}</strong></p>
    <p style="margin: 0 0 1em;">
      Pack einfach. Wir lesen aus der Tradition. Kein Wifi, kein Telefon
      ab Eintritt.
    </p>
    <p style="margin: 0 0 1em;">
      Genaue Anreise-Hinweise folgen vier Wochen vor dem Termin per Post.
    </p>
    <p style="margin: 0 0 1em;">Tobias</p>
  `;
  return communitasShell(inner);
}
