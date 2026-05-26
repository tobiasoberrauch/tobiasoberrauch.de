/**
 * Retreat pricing rules (Spec FR-031).
 *
 * Shared between the list endpoint (`GET /api/communitas/retreats`), the
 * book endpoint (`POST /api/communitas/retreats/[id]/book`), and the
 * Astro page (`/communitas-mitglied/reisen.astro`).
 *
 * Inner Circle (and NORDSTERN, once introduced) are fully included.
 * Voll members pay `base_price_cents + voll_surcharge_cents` (default 1800 €
 * — adjustable per retreat via the optional column added in migration 011).
 * Basis members pay the full base price.
 */

export const DEFAULT_VOLL_SURCHARGE_CENTS = 180000; // €1800

export type ActiveTier =
  | 'basis'
  | 'voll'
  | 'inner_circle'
  | 'nordstern'
  | null;

export function priceForMemberCents(
  tier: ActiveTier,
  basePriceCents: number,
  vollSurchargeCents: number | null,
): number {
  switch (tier) {
    case 'inner_circle':
    case 'nordstern':
      return 0;
    case 'voll': {
      const surcharge = vollSurchargeCents ?? DEFAULT_VOLL_SURCHARGE_CENTS;
      return basePriceCents + surcharge;
    }
    case 'basis':
    default:
      return basePriceCents;
  }
}
