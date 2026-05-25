/**
 * Template 1 — Aufnahme-Bestätigung
 *
 * Wording is fixed by contracts/email-templates.md §1; do not paraphrase.
 */
import { communitasShell, paragraphs } from './_common.js';

export interface ConfirmationProps {
  name: string;
}

export default function confirmation(props: Record<string, unknown>): string {
  const p = props as unknown as ConfirmationProps;
  const body = `Liebe(r) ${p.name},

deine Bewerbung ist angekommen. Tobias oder ein Begleiter meldet sich
innerhalb von vierzehn Tagen.

Du kannst diesen Brief unbeantwortet lassen. Wir antworten nur, wenn wir
mit dir sprechen wollen — oder wenn wir gemeinsam zu dem Schluss kommen,
dass du anderswo besser aufgehoben bist.

Bis dahin: nimm dir Zeit. Niemand wartet auf eine Reaktion von dir.

In Stille,
Tobias`;

  return communitasShell(paragraphs(body));
}
