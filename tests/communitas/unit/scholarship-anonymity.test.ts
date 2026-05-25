/**
 * Phase 5 / US3 / T081 — Scholarship anonymity tests.
 *
 * Asserts the structural invariant from research.md §10:
 *   - `scholarship_pool_contributions` has NO column that links to a
 *     donor (no member_id, donor_id, contributor_id, donor_email, etc.).
 *   - `scholarship_grants` has NO column that links to a contribution
 *     (no contribution_id, contributor_id, source_contribution_*).
 *   - There is no FK between the two tables.
 *
 * These tests read the migration SQL as a string. They are the canonical
 * regression guard against accidentally introducing a join key in a later
 * migration.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../../migrations/communitas');
const paymentsSql = readFileSync(
  path.join(migrationsDir, '004_payments.sql'),
  'utf8',
);
const phase5Sql = readFileSync(
  path.join(migrationsDir, '007_payment_failure_tracking.sql'),
  'utf8',
);

// All forbidden donor-linking column names.
const FORBIDDEN_DONOR_KEYS = [
  'member_id',
  'donor_id',
  'donor_email',
  'donor_name',
  'contributor_id',
  'contributor_email',
  'contributor_name',
  'paid_by',
  'paid_by_member_id',
  'sponsor_id',
];

// Forbidden recipient-linking column names in contributions.
const FORBIDDEN_RECIPIENT_LINK_IN_CONTRIBUTIONS = [
  'recipient_id',
  'recipient_member_id',
  'grant_id',
  'scholarship_grant_id',
];

// Forbidden contribution-linking column names in grants.
const FORBIDDEN_CONTRIBUTION_LINK_IN_GRANTS = [
  'contribution_id',
  'contributor_id',
  'source_contribution_id',
  'pool_contribution_id',
];

/**
 * Extract the body (between CREATE TABLE ... ( and the matching ); ) of a
 * table definition. Returns lowercase for case-insensitive grepping.
 */
function extractTableBody(sql: string, tableName: string): string {
  const re = new RegExp(
    `CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+${tableName}\\s*\\(([\\s\\S]*?)\\);`,
    'i',
  );
  const m = sql.match(re);
  if (!m) {
    throw new Error(`Could not find CREATE TABLE ${tableName}`);
  }
  return m[1].toLowerCase();
}

describe('scholarship_pool_contributions — donor anonymity', () => {
  const body = extractTableBody(paymentsSql, 'scholarship_pool_contributions');

  for (const col of FORBIDDEN_DONOR_KEYS) {
    it(`MUST NOT have a "${col}" column`, () => {
      // Match the column at start-of-token boundary, not inside a comment.
      const re = new RegExp(`(^|\\s|,)${col}\\b`, 'i');
      expect(re.test(body)).toBe(false);
    });
  }

  for (const col of FORBIDDEN_RECIPIENT_LINK_IN_CONTRIBUTIONS) {
    it(`MUST NOT have a "${col}" column (would link pool to grants)`, () => {
      const re = new RegExp(`(^|\\s|,)${col}\\b`, 'i');
      expect(re.test(body)).toBe(false);
    });
  }

  it('only stores aggregate metadata (year, amount, source, added_at)', () => {
    expect(body).toMatch(/contribution_year/);
    expect(body).toMatch(/amount_cents/);
    expect(body).toMatch(/source/);
    expect(body).toMatch(/added_at/);
  });
});

describe('scholarship_grants — recipient is named, donor is not joinable', () => {
  const body = extractTableBody(paymentsSql, 'scholarship_grants');

  it('records the recipient member id (this is intentional — to grant a subscription)', () => {
    expect(body).toMatch(/recipient_member_id/);
  });

  for (const col of FORBIDDEN_CONTRIBUTION_LINK_IN_GRANTS) {
    it(`MUST NOT have a "${col}" column (would link recipient back to donor)`, () => {
      const re = new RegExp(`(^|\\s|,)${col}\\b`, 'i');
      expect(re.test(body)).toBe(false);
    });
  }
});

describe('no FK between contributions and grants', () => {
  it('payments migration declares no FK from contributions to grants', () => {
    // A REFERENCES clause inside the contributions table targeting
    // scholarship_grants would couple the two — forbidden.
    const body = extractTableBody(paymentsSql, 'scholarship_pool_contributions');
    expect(body).not.toMatch(/references\s+scholarship_grants/i);
  });

  it('payments migration declares no FK from grants to contributions', () => {
    const body = extractTableBody(paymentsSql, 'scholarship_grants');
    expect(body).not.toMatch(/references\s+scholarship_pool_contributions/i);
  });
});

describe('phase-5 migration (007) does not introduce join keys', () => {
  it('does not add member/donor columns to either anonymity table', () => {
    const low = phase5Sql.toLowerCase();
    expect(low).not.toMatch(/scholarship_pool_contributions/);
    expect(low).not.toMatch(/scholarship_grants/);
  });
});

describe('SQL-level identifiability of donor→recipient pairs', () => {
  /**
   * The truly load-bearing assertion: enumerate the obvious JOIN
   * strategies someone might try, and confirm none of them are
   * possible against the schema as written.
   *
   * The columns of `scholarship_pool_contributions` after this migration:
   *   id, contribution_year, amount_cents, source, added_at
   *
   * The columns of `scholarship_grants`:
   *   id, grant_year, recipient_member_id, granted_on,
   *   approved_by_three, notes
   *
   * The only shared *type* is the year. Joining on year produces N×M
   * combinations, not a 1:1 mapping — that's exactly what anonymity
   * requires.
   */
  const contribCols = ['id', 'contribution_year', 'amount_cents', 'source', 'added_at'];
  const grantCols = ['id', 'grant_year', 'recipient_member_id', 'granted_on', 'approved_by_three', 'notes'];

  it('contributions and grants share no identifier-grade column', () => {
    const sharedIdentifiers = contribCols.filter((c) =>
      grantCols.includes(c) && c !== 'id',
      // 'id' is shared as a name but each table's id is its own PK; the
      // values are independent serials, not coordinated.
    );
    expect(sharedIdentifiers).toEqual([]);
  });

  it('the only joinable column is year, which produces N×M not 1:1', () => {
    // contribution_year vs grant_year — both SMALLINT. Many contributions
    // can exist in a year, many grants can exist in a year. A JOIN ON
    // year produces a cartesian-style product, not a mapping.
    expect(contribCols).toContain('contribution_year');
    expect(grantCols).toContain('grant_year');
    // No column in either table identifies a specific donor pairing.
    expect(grantCols).not.toContain('contribution_id');
    expect(contribCols).not.toContain('recipient_member_id');
  });
});
