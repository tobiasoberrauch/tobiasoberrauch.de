/**
 * Template 14 — Stipendien-Vergabe-Trigger (jährlich an die drei Begleiter).
 *
 * Wording per contracts/email-templates.md §14. Sent by the
 * `scholarship-cycle` cron on Nov 1 to all members with role='companion'.
 *
 * The `decision_url` placeholder points to the Begleiter-only admin page
 * that Phase 8 will polish. For Phase 5 the URL is provided but the page
 * is a stub — Begleiter call `POST /api/communitas/admin/scholarships/grant`
 * directly (or via curl) until the UI ships.
 */
import { communitasShell, paragraphs } from './_common.js';

export interface ScholarshipTriggerProps {
  /**
   * Pool size formatted as German euros, e.g. "7.200,00".
   */
  pool_amount_eur: string;
  n_grants: number;
  /** Optional — Phase 5 may not produce a PDF yet. Pass empty string to hide. */
  anonymized_letters_pdf_url?: string;
  decision_url: string;
}

export default function scholarshipTrigger(
  props: Record<string, unknown>,
): string {
  const p = props as unknown as ScholarshipTriggerProps;
  const pdfLine = (p.anonymized_letters_pdf_url ?? '').trim()
    ? `Hier sind die anonymisierten Bewerbungsbriefe:

${p.anonymized_letters_pdf_url}`
    : `Die anonymisierten Bewerbungsbriefe werden separat verteilt.`;

  const body = `Begleiter,

der Pool steht für dieses Jahr: ${p.pool_amount_eur} Euro.
Wir können ${p.n_grants} stille Stipendien vergeben.

${pdfLine}

Bitte trefft eure Entscheidung einstimmig. Niemand sonst sieht eure
Diskussion. Trage deine Wahl ein:

${p.decision_url}

In Stille,
Tobias`;

  return communitasShell(paragraphs(body));
}
