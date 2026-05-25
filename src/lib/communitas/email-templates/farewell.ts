/**
 * Template 15 — „Du gehst in Frieden."
 *
 * Trigger: account leave endpoint (T092). Sent before deletion completes,
 * so a deletion failure still leaves the member with a farewell that
 * matches what they were told.
 */
import { communitasShell, paragraphs } from './_common.js';

export interface FarewellProps {
  name: string;
}

export default function farewell(props: Record<string, unknown>): string {
  const p = props as unknown as FarewellProps;
  const body = `${p.name},

du gehst in Frieden.

Deine Daten sind exportiert. Was im System lag, ist gelöscht oder wird
in den nächsten Stunden gelöscht.

Wenn du eines Tages wiederkommen willst, schreibst du uns einfach.

Wir tragen einander, ohne uns festzuhalten.

Tobias`;

  return communitasShell(paragraphs(body));
}
