/**
 * Magic-link auth + signed-cookie sessions for Communitas.
 *
 * Session cookie format: `<sessionId>.<hmacBase64Url>` where the HMAC uses
 * COMMUNITAS_SESSION_SECRET. Sessions live in the `sessions` table; 7-day TTL.
 */

import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { sql } from './db.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAGIC_LINK_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const SESSION_COOKIE_NAME = 'communitas_session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSessionSecret(): Buffer {
  const raw = process.env.COMMUNITAS_SESSION_SECRET;
  if (!raw) {
    throw new Error('COMMUNITAS_SESSION_SECRET is not set.');
  }
  return Buffer.from(raw, 'base64');
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function b64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function hmacSession(sessionId: string): string {
  return b64url(
    createHmac('sha256', getSessionSecret()).update(sessionId).digest()
  );
}

function verifyHmac(sessionId: string, expectedB64Url: string): boolean {
  const calculated = hmacSession(sessionId);
  const a = Buffer.from(calculated);
  const b = Buffer.from(expectedB64Url);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Magic links
// ---------------------------------------------------------------------------

export interface MagicLinkResult {
  /** Raw token to be embedded in the login URL — never persisted. */
  token: string;
  expiresAt: Date;
}

export async function createMagicLink(memberId: number): Promise<MagicLinkResult> {
  const tokenBytes = randomBytes(32);
  const token = b64url(tokenBytes);
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await sql`
    INSERT INTO magic_links (token_hash, member_id, expires_at)
    VALUES (${tokenHash}, ${memberId}, ${expiresAt})
  `;

  return { token, expiresAt };
}

export interface ConsumedLink {
  memberId: number;
}

export async function consumeMagicLink(
  rawToken: string
): Promise<ConsumedLink | null> {
  const tokenHash = sha256Hex(rawToken);
  const rows = await sql<
    { member_id: number; used_at: Date | null; expires_at: Date }[]
  >`
    SELECT member_id, used_at, expires_at
    FROM magic_links
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await sql`
    UPDATE magic_links SET used_at = now() WHERE token_hash = ${tokenHash}
  `;
  return { memberId: Number(row.member_id) };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionInfo {
  memberId: number;
  role: 'member' | 'companion' | 'founder';
}

/**
 * Create a session row and return the signed cookie value
 * (`<sessionId>.<hmacBase64Url>`).
 */
export async function createSession(
  memberId: number,
  userAgent?: string,
  ipCountry?: string
): Promise<string> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`
    INSERT INTO sessions (id, member_id, user_agent, ip_country, expires_at)
    VALUES (${sessionId}, ${memberId}, ${userAgent ?? null}, ${ipCountry ?? null}, ${expiresAt})
  `;
  return `${sessionId}.${hmacSession(sessionId)}`;
}

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function getSession(request: Request): Promise<SessionInfo | null> {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) return null;
  const dot = raw.indexOf('.');
  if (dot < 0) return null;
  const sessionId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verifyHmac(sessionId, sig)) return null;

  const rows = await sql<
    {
      member_id: number;
      expires_at: Date;
      revoked_at: Date | null;
      role: 'member' | 'companion' | 'founder';
    }[]
  >`
    SELECT s.member_id, s.expires_at, s.revoked_at, m.role
    FROM sessions s
    JOIN members m ON m.id = s.member_id
    WHERE s.id = ${sessionId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { memberId: Number(row.member_id), role: row.role };
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
  toResponse(): Response {
    return new Response(this.message, { status: this.status });
  }
}

export async function requireMember(request: Request): Promise<SessionInfo> {
  const s = await getSession(request);
  if (!s) throw new AuthError(401, 'Unauthorized');
  return s;
}

export async function requireCompanion(request: Request): Promise<SessionInfo> {
  const s = await getSession(request);
  if (!s) throw new AuthError(401, 'Unauthorized');
  if (s.role !== 'companion' && s.role !== 'founder') {
    throw new AuthError(403, 'Forbidden');
  }
  return s;
}

export const SESSION_COOKIE = SESSION_COOKIE_NAME;
