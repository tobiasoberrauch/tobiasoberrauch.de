/**
 * Pure validation helpers for the public application endpoint.
 *
 * Kept dependency-free so that the unit test can exercise the logic without
 * touching the DB, network, or env vars.
 */

export interface ApplicationInput {
  name: string;
  email: string;
  question: string;
  letter_to_self?: string;
  desired_tier?: string;
  consent: boolean;
}

export type ValidationOk = {
  ok: true;
  value: {
    name: string;
    email: string;
    question: string;
    letter_to_self: string;
    desired_tier: 'basis' | 'voll' | 'inner_circle';
    consent: true;
  };
};

export type ValidationErr = {
  ok: false;
  code: 'validation_error';
  field: 'name' | 'email' | 'question' | 'letter_to_self' | 'desired_tier' | 'consent';
  detail?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIERS = new Set(['basis', 'voll', 'inner_circle']);

/**
 * Validate an application body parsed from either JSON or form-encoded input.
 * Returns either an `ok` shape with normalised values or a structured error
 * with the offending field.
 */
export function validateApplicationBody(
  raw: unknown,
): ValidationOk | ValidationErr {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, code: 'validation_error', field: 'name' };
  }
  const r = raw as Record<string, unknown>;

  // Coerce consent from common shapes (JSON true, form 'true', 'on', '1').
  const consentRaw = r.consent;
  const consent =
    consentRaw === true ||
    consentRaw === 'true' ||
    consentRaw === 'on' ||
    consentRaw === '1';

  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (name.length < 1 || name.length > 120) {
    return { ok: false, code: 'validation_error', field: 'name' };
  }

  const email = typeof r.email === 'string' ? r.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, code: 'validation_error', field: 'email' };
  }

  const question = typeof r.question === 'string' ? r.question.trim() : '';
  if (question.length < 1) {
    return { ok: false, code: 'validation_error', field: 'question' };
  }
  if (question.length > 2000) {
    return { ok: false, code: 'validation_error', field: 'question' };
  }

  const letter_to_self =
    typeof r.letter_to_self === 'string' ? r.letter_to_self : '';
  if (letter_to_self.length > 10000) {
    return { ok: false, code: 'validation_error', field: 'letter_to_self' };
  }

  const desired_tier =
    typeof r.desired_tier === 'string' && r.desired_tier
      ? r.desired_tier
      : 'basis';
  if (!TIERS.has(desired_tier)) {
    return { ok: false, code: 'validation_error', field: 'desired_tier' };
  }

  if (!consent) {
    return { ok: false, code: 'validation_error', field: 'consent' };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      question,
      letter_to_self,
      desired_tier: desired_tier as 'basis' | 'voll' | 'inner_circle',
      consent: true,
    },
  };
}
