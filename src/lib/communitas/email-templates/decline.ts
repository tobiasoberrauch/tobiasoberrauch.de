/**
 * Template 3 — Aufnahme-Ablehnung
 *
 * Always includes the hotline list (Spec FR-005 spirit also in mail form).
 */
import { communitasShell, paragraphs } from './_common.js';

export interface DeclineProps {
  name: string;
}

export default function decline(props: Record<string, unknown>): string {
  const p = props as unknown as DeclineProps;
  const body = `Liebe(r) ${p.name},

wir haben deine Frage gelesen und überlegt. Diesmal nehmen wir dich nicht
auf.

Das ist keine Wertung deiner Person. Es ist eine Wertung des Augenblicks —
ob das, was du suchst, hier seinen Ort hat. Wir glauben, es liegt anderswo.

Wenn du in akuter seelischer Not bist, hier sind Hände:

- Telefonseelsorge: 0800 111 0 111 oder 0800 111 0 222 (rund um die Uhr,
  kostenlos, anonym)
- Notruf: 112

Wir wünschen dir Frieden.

Tobias`;

  return communitasShell(paragraphs(body));
}
