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

export interface MailAttachment {
  /** Display filename in the mail client. */
  filename: string;
  /** Raw content; passed as base64 to Resend. */
  content: Buffer | Uint8Array;
  /** Optional MIME type; defaults to application/octet-stream. */
  contentType?: string;
}

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
  /** Optional file attachments — used by the account-export flow (T091). */
  attachments?: MailAttachment[];
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

/**
 * Send a list of messages in throttled chunks, returning per-message results.
 *
 * Resend's free tier allows 10 requests/second. We chunk to `chunkSize`
 * concurrent calls (default 10), `Promise.allSettled` each chunk, then sleep
 * `gapMs` (default 1100ms) before the next. The per-message HTTP error is
 * preserved in the returned array; the caller decides what to do with each.
 */
export async function sendBatched(
  messages: MailParams[],
  opts: { chunkSize?: number; gapMs?: number } = {},
): Promise<MailResult[]> {
  const chunkSize = opts.chunkSize ?? 10;
  const gapMs = opts.gapMs ?? 1100;
  const results: MailResult[] = new Array(messages.length);

  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    const settled = await Promise.allSettled(chunk.map((m) => sendMail(m)));
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      if (s.status === 'fulfilled') {
        results[i + j] = s.value;
      } else {
        results[i + j] = {
          ok: false,
          code: 'upstream_error',
          detail: (s.reason as Error)?.message ?? String(s.reason),
        };
      }
    }
    if (i + chunkSize < messages.length) {
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }

  return results;
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
  if (params.attachments && params.attachments.length > 0) {
    body.attachments = params.attachments.map((a) => {
      const buf =
        a.content instanceof Buffer ? a.content : Buffer.from(a.content);
      return {
        filename: a.filename,
        content: buf.toString('base64'),
        content_type: a.contentType ?? 'application/octet-stream',
      };
    });
  }

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
