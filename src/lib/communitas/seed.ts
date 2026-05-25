/**
 * Dev-only seed data. Inserts Tobias (founder) and three placeholder
 * Begleiter (companion) so the four-voice constraint can be exercised
 * during local development.
 *
 * Guarded by NODE_ENV !== 'production' — refuses to write to a prod DB.
 */

import { sql } from './db.js';

export interface SeedResult {
  inserted: number;
  skipped: number;
  total: number;
}

interface Seed {
  email: string;
  display_name: string;
  role: 'founder' | 'companion';
}

export async function seedDevData(): Promise<SeedResult> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seedDevData() refuses to run with NODE_ENV=production.');
  }

  const founderEmail =
    process.env.COMMUNITAS_ADMIN_NOTIFY_EMAIL ?? 'tobias@tobiasoberrauch.de';

  const seeds: Seed[] = [
    { email: founderEmail,                  display_name: 'Tobias',      role: 'founder'  },
    { email: 'begleiter-1@example.test',    display_name: 'Begleiter 1', role: 'companion'},
    { email: 'begleiter-2@example.test',    display_name: 'Begleiter 2', role: 'companion'},
    { email: 'begleiter-3@example.test',    display_name: 'Begleiter 3', role: 'companion'},
  ];

  let inserted = 0;
  let skipped = 0;
  for (const s of seeds) {
    const rows = await sql<{ id: number }[]>`
      INSERT INTO members (email, display_name, role, current_schale_key)
      VALUES (${s.email}, ${s.display_name}, ${s.role}, 'speculum')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (rows.length > 0) inserted += 1;
    else skipped += 1;
  }
  return { inserted, skipped, total: seeds.length };
}
