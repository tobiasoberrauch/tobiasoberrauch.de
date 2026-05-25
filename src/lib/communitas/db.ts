/**
 * Postgres client + migration runner for Communitas Cotidiana.
 *
 * The `sql` export is a lazily-instantiated postgres.js client. We construct it
 * only on first call so that, in environments where COMMUNITAS_DATABASE_URL is
 * absent (e.g. local unit-test runs, the Astro build with prerender:true), the
 * module can still be imported without throwing.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres, { type Sql } from 'postgres';

let _sql: Sql | null = null;

function getSql(): Sql {
  if (_sql) return _sql;
  const url = process.env.COMMUNITAS_DATABASE_URL;
  if (!url) {
    throw new Error(
      'COMMUNITAS_DATABASE_URL is not set. Refusing to construct postgres client.'
    );
  }
  _sql = postgres(url, {
    idle_timeout: 20,
    max: 10,
    // Neon requires SSL; the connection string already contains sslmode=require.
    // We pass ssl: 'require' explicitly so local Postgres works if someone
    // forgets the query-string parameter.
    ssl: url.includes('sslmode=disable') ? false : 'require',
  });
  return _sql;
}

/**
 * Singleton-style accessor. Use `sql\`SELECT ...\`` as you would the postgres.js
 * tagged template, but lazily instantiated.
 */
export const sql: Sql = new Proxy({} as Sql, {
  get(_target, prop) {
    const client = getSql();
    // Forward all property reads (including the callable behaviour via Symbol).
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  apply(_target, _this, args) {
    const client = getSql();
    // postgres.js client is itself a callable tagged-template; cast required.
    return (client as unknown as (...a: unknown[]) => unknown)(...args);
  },
}) as Sql;

export interface MigrationResult {
  filename: string;
  applied: boolean;
  durationMs: number;
}

/**
 * Locate the `migrations/communitas/` directory relative to repo root.
 * We resolve via this file's URL, then walk up out of `src/lib/communitas/`.
 */
function findMigrationsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/lib/communitas → repo root → migrations/communitas
  // From tsx (source): ../../../migrations/communitas
  // From dist (built): also resolves; both reach the same physical path.
  return path.resolve(here, '../../../migrations/communitas');
}

/**
 * Apply every `*.sql` file in migrations/communitas/ in alphabetical order.
 *
 * Each file is executed inside a single transaction. Files are written
 * idempotently (CREATE … IF NOT EXISTS, INSERT … ON CONFLICT DO NOTHING),
 * so re-running is safe and we don't need a meta-table.
 */
export async function runMigrations(): Promise<MigrationResult[]> {
  const dir = findMigrationsDir();
  const entries = await fs.readdir(dir);
  const files = entries
    .filter((n) => n.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const client = getSql();
  const results: MigrationResult[] = [];

  for (const filename of files) {
    const full = path.join(dir, filename);
    const sqlText = await fs.readFile(full, 'utf8');
    const started = Date.now();
    // postgres.js exposes .begin for transactional helper. We use .unsafe
    // because the file contains a freeform SQL string with multiple statements
    // and DO $$ blocks.
    await client.begin(async (tx) => {
      await tx.unsafe(sqlText);
    });
    results.push({
      filename,
      applied: true,
      durationMs: Date.now() - started,
    });
  }

  return results;
}

/** Close the postgres client (for clean script exit). */
export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
  }
}
