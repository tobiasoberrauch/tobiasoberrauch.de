/**
 * HMAC-signed one-click cancellation tokens.
 *
 * The renewal-reminder email (template 11) includes a single link the
 * member can click to cancel without authenticating. Following Spec
 * FR-019 — "no Are-you-sure modal, no retention flow" — that link must
 * work on first GET.
 *
 * Token format (URL-safe):
 *   <b64u(subscription_id)>.<b64u(expires_at_iso)>.<b64u(hmac_sha256)>
 *
 * HMAC is computed over `${subscription_id}|${expires_at_iso}` using
 * COMMUNITAS_SESSION_SECRET as the key (same secret as the session-cookie
 * HMAC). Constant-time compare on verify.
 *
 * The token is stateless — we don't persist a cancellation_tokens table.
 * Expiry is enforced via the `expires_at` field, default 60 days.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function getSecret(): Buffer {
  const raw = process.env.COMMUNITAS_SESSION_SECRET;
  if (!raw) throw new Error('COMMUNITAS_SESSION_SECRET is not set.');
  return Buffer.from(raw, 'base64');
}

function b64u(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64uDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64').toString('utf8');
}

function sign(subscriptionId: number, expiresAtIso: string): string {
  return b64u(
    createHmac('sha256', getSecret())
      .update(`${subscriptionId}|${expiresAtIso}`)
      .digest(),
  );
}

export interface CancelTokenPayload {
  subscriptionId: number;
  expiresAt: Date;
}

/**
 * Mint a token for a given subscription. Default expiry 60 days, which
 * comfortably outlives the renewal-reminder's 4-week window. Pass a
 * different `ttlMs` only if a specific use-case requires it.
 */
export function createCancelToken(
  subscriptionId: number,
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const expiresAt = new Date(Date.now() + ttlMs);
  const iso = expiresAt.toISOString();
  const sig = sign(subscriptionId, iso);
  return `${b64u(String(subscriptionId))}.${b64u(iso)}.${sig}`;
}

/**
 * Verify a token and return its payload. Returns null on any failure —
 * malformed, expired, bad signature.
 */
export function verifyCancelToken(token: string): CancelTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [idB64, isoB64, sigB64] = parts;
  let subscriptionIdRaw: string;
  let isoRaw: string;
  try {
    subscriptionIdRaw = b64uDecode(idB64);
    isoRaw = b64uDecode(isoB64);
  } catch {
    return null;
  }
  const subscriptionId = Number(subscriptionIdRaw);
  if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) return null;
  const expiresAt = new Date(isoRaw);
  if (Number.isNaN(expiresAt.getTime())) return null;
  if (expiresAt.getTime() < Date.now()) return null;

  let expectedSig: string;
  try {
    expectedSig = sign(subscriptionId, isoRaw);
  } catch {
    return null;
  }
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  return { subscriptionId, expiresAt };
}
