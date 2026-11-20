import { asc, eq } from 'drizzle-orm';
import type { Role, UserDTO } from '@msl/shared';
import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { hashPassword, randomToken } from '../../lib/crypto.js';
import { conflict, notFound } from '../../lib/http-error.js';

const toDTO = (u: typeof users.$inferSelect): UserDTO => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  twoFactorEnabled: !!u.totpSecret, locked: !!u.lockedAt,
});

export async function listUsers(): Promise<UserDTO[]> {
  return (await db.select().from(users).orderBy(asc(users.createdAt))).map(toDTO);
}

/**
 * Creates the user with a random unusable password.
 * TODO: email an invite link where they set a password and enrol TOTP.
 */
export async function inviteUser(input: { name: string; email: string; role: Role }) {
  const email = input.email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw conflict('A user with this email already exists');
  const [row] = await db.insert(users)
    .values({ name: input.name, email, role: input.role, passwordHash: await hashPassword(randomToken()) })
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
