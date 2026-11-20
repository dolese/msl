import { asc, eq } from 'drizzle-orm';
import type { Role, UserDTO } from '@msl/shared';
import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { hashPassword } from '../../lib/crypto.js';
import { conflict, notFound } from '../../lib/http-error.js';

const toDTO = (u: typeof users.$inferSelect): UserDTO => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  twoFactorEnabled: !!u.totpSecret, locked: !!u.lockedAt,
});

export async function listUsers(): Promise<UserDTO[]> {
  return (await db.select().from(users).orderBy(asc(users.createdAt))).map(toDTO);
}

/**
 * Creates the user with a temporary password chosen by the admin, who passes it on.
 * The user should change it under Account after signing in.
 */
export async function inviteUser(input: { name: string; email: string; role: Role; password: string }) {
  const email = input.email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw conflict('A user with this email already exists');
  const [row] = await db.insert(users)
    .values({ name: input.name, email, role: input.role, passwordHash: await hashPassword(input.password) })
    .returning();
  return toDTO(row!);
}

export async function setRole(id: string, role: Role) {
  const [row] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
  if (!row) throw notFound('User not found');
  return toDTO(row);
}

export async function unlock(id: string) {
  const [row] = await db.update(users).set({ lockedAt: null, failedLogins: 0 }).where(eq(users.id, id)).returning();
  if (!row) throw notFound('User not found');
  return toDTO(row);
}
