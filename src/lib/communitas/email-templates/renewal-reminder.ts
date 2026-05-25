/**
 * Template 11 — Erneuerungs-Erinnerung (4 Wochen vor Jahres-Ende).
 *
 * Wording is fixed by contracts/email-templates.md §11; do not paraphrase.
 *
 * Phase 5 NOTE: the cron job that selects subscriptions due-in-four-weeks
 * and sends this template is NOT implemented in Phase 5 — only the template
 * itself, ready for a Phase-8 polish task to wire it. The one-click cancel
 * URL points at `/api/communitas/subscription/cancel?token=...` (HMAC-signed),
 * which IS implemented in Phase 5.
 */
import { communitasShell, paragraphs } from './_common.js';

export interface RenewalReminderProps {
  name: string;
  /** Already formatted in German (e.g. "1. November 2026"). */
  renewal_date: string;
  one_click_cancel_url: string;
}

export default function renewalReminder(
  props: Record<string, unknown>,
): string {
  const p = props as unknown as RenewalReminderProps;
  const body = `${p.name},

am ${p.renewal_date} erneuert sich deine Mitgliedschaft. Du musst nichts tun,
wenn du bleiben willst.

Wenn du gehen willst, klicke hier — einmal genügt:

${p.one_click_cancel_url}

Wir tragen einander, ohne uns festzuhalten.

Tobias`;

  return communitasShell(paragraphs(body));
}
