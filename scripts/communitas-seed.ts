#!/usr/bin/env tsx
import { seedDevData } from '../src/lib/communitas/seed.js';
import { closeDb } from '../src/lib/communitas/db.js';

async function main(): Promise<void> {
  if (!process.env.COMMUNITAS_DATABASE_URL) {
    console.error('COMMUNITAS_DATABASE_URL is required.');
    process.exit(1);
  }
  const r = await seedDevData();
  console.log(
    `[communitas:seed] inserted=${r.inserted} skipped=${r.skipped} total=${r.total}`
  );
}

main()
  .catch((err: unknown) => {
    console.error('[communitas:seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
