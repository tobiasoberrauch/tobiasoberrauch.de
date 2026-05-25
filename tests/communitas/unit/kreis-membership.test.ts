/**
 * Phase 7 / US5 — Pure membership-check unit test.
 *
 * The send endpoint authorizes by membership: caller must appear in
 * kreis_members with left_at IS NULL. We extract the decision into a
 * pure function so this test does not need a live database.
 */
import { describe, it, expect } from 'vitest';
import {
  canSendToKreis,
  memberJoinedAt,
} from '../../../src/lib/communitas/kreis-membership';

describe('canSendToKreis', () => {
  it('returns true for an active member', () => {
    expect(canSendToKreis(7, [{ member_id: 7, left_at: null }])).toBe(true);
  });

  it('returns false for a member who has left', () => {
    expect(
      canSendToKreis(7, [{ member_id: 7, left_at: new Date('2026-01-01') }]),
    ).toBe(false);
  });

  it('returns false for a non-member', () => {
    expect(canSendToKreis(7, [{ member_id: 8, left_at: null }])).toBe(false);
  });

  it('returns false on an empty membership list', () => {
    expect(canSendToKreis(7, [])).toBe(false);
  });

  it('coerces string member_id ("7") correctly', () => {
    expect(
      canSendToKreis(7, [
        { member_id: '7' as unknown as number, left_at: null },
      ]),
    ).toBe(true);
  });
});

describe('memberJoinedAt', () => {
  it('returns joined_at for an active member', () => {
    const j = '2026-03-01T10:00:00Z';
    const got = memberJoinedAt(7, [
      { member_id: 7, joined_at: j, left_at: null },
    ]);
    expect(got).not.toBeNull();
    expect(got?.toISOString()).toBe(new Date(j).toISOString());
  });

  it('returns null for a member who has left', () => {
    expect(
      memberJoinedAt(7, [
        {
          member_id: 7,
          joined_at: '2026-03-01T10:00:00Z',
          left_at: new Date(),
        },
      ]),
    ).toBeNull();
  });

  it('returns null for a non-member', () => {
    expect(memberJoinedAt(99, [])).toBeNull();
  });
});
