// @ts-check
/**
 * Applies the SQL migrations in ./drizzle. Uses only runtime dependencies,
 * so it works as Railway's pre-deploy command: `npm run db:migrate`.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, '../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await migrate(drizzle(pool), { migrationsFolder: resolve(here, '../drizzle') });
await pool.end();
console.log('Migrations applied');
