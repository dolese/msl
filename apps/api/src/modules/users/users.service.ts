import { asc, eq, or } from 'drizzle-orm';
import type { InviteUserInput, Role, UserDTO } from '@msl/shared';
import { inviteUserSchema } from '@msl/shared';
import type { z } from 'zod';
import { db } from '../../db/client.js';
import { sessions, users } from '../../db/schema.js';
import { hashPassword } from '../../lib/crypto.js';
import { conflict, notFound } from '../../lib/http-error.js';

const toDTO = (u: typeof users.$inferSelect): UserDTO => ({
  id: u.id, name: u.name, email: u.email, username: u.username, role: u.role,
  twoFactorEnabled: !!u.totpSecret, locked: !!u.lockedAt,
});

/** Login name shown in lists and audit entries. */
export const loginOf = (u: { email: string | null; username: string | null }) => u.username ?? u.email ?? '';

export async function listUsers(): Promise<UserDTO[]> {
  return (await db.select().from(users).orderBy(asc(users.createdAt))).map(toDTO);
}

/** Creates a personal account with a password chosen by the admin, who hands it over. */
export async function createUser(input: z.output<typeof inviteUserSchema>): Promise<UserDTO> {
  const username = input.username;
  const email = input.email ?? null;
  // Sign-in names must be unique across both columns ("paul" can't be one user's username and another's email).
  const taken = async (v: string) =>
    (await db.select({ id: users.id }).from(users).where(or(eq(users.email, v), eq(users.username, v))).limit(1)).length > 0;
  if (await taken(username)) throw conflict('That username is already taken');
  if (email && (await taken(email))) throw conflict('A user with this email already exists');
  const [row] = await db.insert(users).values({
    name: input.name, email, username, role: input.role,
    passwordHash: await hashPassword(input.password),
  }).returning();
  return toDTO(row!);
}
export type { InviteUserInput };

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

/** Admin sets a new password (e.g. a team forgot theirs). Signs the account out everywhere and unlocks it. */
export async function resetPassword(id: string, password: string) {
  const [row] = await db.update(users)
    .set({ passwordHash: await hashPassword(password), failedLogins: 0, lockedAt: null })
    .where(eq(users.id, id)).returning();
  if (!row) throw notFound('User not found');
  await db.delete(sessions).where(eq(sessions.userId, id));
  return toDTO(row);
}
