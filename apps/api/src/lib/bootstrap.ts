import { count } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { hashPassword } from './crypto.js';

/**
 * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when nobody exists yet,
 * so a fresh deployment can be used without shell access. Does nothing afterwards.
 */
export async function ensureFirstAdmin(): Promise<void> {
  const [row] = await db.select({ n: count() }).from(users);
  if ((row?.n ?? 0) > 0) return;

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = env();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create the first admin.');
    return;
  }
  await db.insert(users).values({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    role: 'admin',
    passwordHash: await hashPassword(ADMIN_PASSWORD),
  }).onConflictDoNothing({ target: users.email });
  console.log(`Created first admin ${ADMIN_EMAIL}. Sign in and change the password under Account.`);
}
