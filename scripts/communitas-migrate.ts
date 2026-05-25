#!/usr/bin/env tsx
/**
 * CLI wrapper around runMigrations(). Invoked by `npm run communitas:migrate`.
 *
 * Usage:
 *   COMMUNITAS_DATABASE_URL=postgres://... npm run communitas:migrate
 *
 * Exits 0 on success, 1 on any error.
 */

import { runMigrations, closeDb } from '../src/lib/communitas/db.js';

async function main(): Promise<void> {
  if (!process.env.COMMUNITAS_DATABASE_URL) {
    console.error('COMMUNITAS_DATABASE_URL is required.');
    process.exit(1);
  }

  console.log('[communitas:migrate] Applying migrations…');
  const results = await runMigrations();
  for (const r of results) {
    console.log(`  ✓ ${r.filename} (${r.durationMs} ms)`);
  }
  console.log(`[communitas:migrate] Done. ${results.length} file(s) applied.`);
}

main()
  .catch((err: unknown) => {
    console.error('[communitas:migrate] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
