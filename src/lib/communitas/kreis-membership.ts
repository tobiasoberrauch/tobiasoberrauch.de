/**
 * Pure membership-check helper for the Briefkreis endpoints — Phase 7 / US5.
 *
 * Extracted so it can be unit-tested without a live database. Endpoints
 * query `kreis_members` themselves; this helper accepts the rows and the
 * caller and decides authorization.
 */

export interface KreisMembershipRow {
  member_id: number;
  left_at: Date | string | null;
}

/**
 * Returns true iff `memberId` is currently a member of the kreis represented
 * by the given rows. Active means: row exists AND `left_at` is null.
 *
 * The caller is responsible for narrowing rows to a single kreis_id before
 * calling this — we don't take the kreis_id here.
 */
export function canSendToKreis(
  memberId: number,
  kreisMembers: ReadonlyArray<KreisMembershipRow>,
): boolean {
  for (const row of kreisMembers) {
    if (Number(row.member_id) === memberId && row.left_at == null) {
      return true;
    }
  }
  return false;
}

/**
 * Lookup the active membership row for `memberId` and return its joined_at,
 * or null if not active. Used by the messages endpoint to apply the
 * read-forward-only rule for newly-added members.
 */
export function memberJoinedAt(
  memberId: number,
  kreisMembers: ReadonlyArray<KreisMembershipRow & { joined_at: Date | string }>,
): Date | null {
  for (const row of kreisMembers) {
    if (Number(row.member_id) === memberId && row.left_at == null) {
      return new Date(row.joined_at);
    }
  }
  return null;
}
