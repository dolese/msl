import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../db/client.js';

/**
 * Applies any pending SQL migrations from apps/api/drizzle before the server starts.
 * Already-applied migrations are skipped, so this is safe on every restart, and it
 * means a deploy never depends on a separate "pre-deploy" step being configured.
 */
export async function runMigrations(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url)); // src/lib or dist/lib
  const folder = resolve(here, '../../drizzle');
  await migrate(db, { migrationsFolder: folder });
  console.log('Database is up to date');
}
