/**
 * Payment-failed reminder — sent ONCE per past_due event (Spec Edge Case
 * "Zahlungsstörung": one mail, sachlich, ohne Drohung, ohne Mahnlauf).
 *
 * Wording is not in contracts/email-templates.md verbatim; written in the
 * established Communitas tone (4–6 lines, no exclamation, no "Action
 * Required", no urgency).
 *
 * The webhook guards repeated sends via `subscriptions.payment_failure_notified_at`.
 */
import { communitasShell, paragraphs } from './_common.js';

export interface PaymentFailedProps {
  name: string;
  update_url: string;
}

export default function paymentFailed(props: Record<string, unknown>): string {
  const p = props as unknown as PaymentFailedProps;
  const body = `${p.name},

deine letzte Abbuchung ist nicht durchgegangen. Wir nehmen an, dass es ein
technisches Versehen ist.

Wenn du bleiben willst, aktualisiere deine Zahlungsdaten hier:

${p.update_url}

Wenn du gehen willst, ist das auch in Ordnung. Schweigen genügt.

Tobias`;

  return communitasShell(paragraphs(body));
}
