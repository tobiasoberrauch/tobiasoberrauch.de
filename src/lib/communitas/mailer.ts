/**
 * Resend wrapper for Communitas Cotidiana mails.
 *
 * Hard constraints (Spec FR-008, FR-009):
 *   - tracking.opens = false
 *   - tracking.clicks = false
 *   - List-Unsubscribe + List-Unsubscribe-Post headers per RFC 8058
 *
 * If RESEND_API_KEY is missing, sendMail() resolves to
 * `{ ok: false, code: 'not_configured' }` rather than throwing — this lets
 * local development and unit tests proceed without secrets.
 */

const RESEND_API = 'https://api.resend.com';

export interface MailParams {
  to: string | string[];
  subject: string;
  html: string;
  /** Extra headers, merged on top of the always-on List-Unsubscribe pair. */
  headers?: Record<string, string>;
  from?: string;
  replyTo?: string;
  /** Plain-text alternative; recommended but optional. */
  text?: string;
}

export type MailResult =
  | { ok: true; id: string }
  | { ok: false; code: 'not_configured' | 'upstream_error' | 'invalid_input'; detail?: string };

function unsubscribeUrl(): string {
  // RFC 8058 one-click target. Implementation comes later (T075-ish) but the
  // header must already be present to satisfy deliverability requirements.
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'communitas@tobiasoberrauch.de';
  // Default fallback — the actual cancellation endpoint will be /api/communitas/subscription/cancel.
  // For non-subscription transactional mail, this still serves as a working
  // unsubscribe surface; the endpoint can route per token in future.
  void fromEmail;
  return 'https://tobiasoberrauch.de/api/communitas/subscription/cancel';
}

export async function sendMail(params: MailParams): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, code: 'not_configured' };
  }

  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? 'communitas@tobiasoberrauch.de';
  const replyTo = params.replyTo ?? process.env.RESEND_REPLY_TO_EMAIL;

  const baseHeaders: Record<string, string> = {
    'List-Unsubscribe': `<${unsubscribeUrl()}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  const body: Record<string, unknown> = {
    from,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    headers: { ...baseHeaders, ...(params.headers ?? {}) },
    tracking: { opens: false, clicks: false },
  };
  if (params.text) body.text = params.text;
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch(`${RESEND_API}/emails`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id ?? '' };
  }

  let detail = '';
  try {
    const j = (await res.json()) as { message?: string };
    detail = j.message ?? '';
  } catch {
    /* ignore */
  }
  return { ok: false, code: 'upstream_error', detail };
}
