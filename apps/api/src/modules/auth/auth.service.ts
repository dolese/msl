import { and, eq, ne, sql } from 'drizzle-orm';
import { authenticator } from 'otplib';
import type { LoginInput } from '@msl/shared';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { sessions, users } from '../../db/schema.js';
import { hashPassword, randomToken, sha256, verifyPassword } from '../../lib/crypto.js';
import { audit } from '../../lib/audit.js';
import { badRequest, HttpError, unauthorized } from '../../lib/http-error.js';

export const MAX_FAILED_LOGINS = 5;
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

authenticator.options = { window: 1 }; // allow ±30s clock drift

export async function signIn(input: LoginInput, ip: string | undefined) {
  const email = input.email.toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Same generic error for unknown user / bad password / bad code — no account enumeration.
  const fail = unauthorized(env().REQUIRE_2FA ? 'Invalid email, password or code' : 'Invalid email or password');

  if (!user) throw fail;
  if (user.lockedAt) throw new HttpError(423, 'Account locked. Contact an administrator.');

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  const require2fa = env().REQUIRE_2FA;
  const totpOk = !require2fa || (!!user.totpSecret && !!input.totp && authenticator.check(input.totp, user.totpSecret));

  if (!passwordOk || !totpOk) {
    const [updated] = await db
      .update(users)
      .set({ failedLogins: sql`${users.failedLogins} + 1` })
      .where(eq(users.id, user.id))
      .returning({ failedLogins: users.failedLogins });
    await audit({ action: 'auth.sign_in_failed', actorId: user.id, ip });
    if ((updated?.failedLogins ?? 0) >= MAX_FAILED_LOGINS) {
      await db.update(users).set({ lockedAt: new Date() }).where(eq(users.id, user.id));
      await audit({ action: 'auth.account_locked', targetLabel: user.email, detail: `${MAX_FAILED_LOGINS} fails`, ip });
    }
    throw fail;
  }

  await db.update(users).set({ failedLogins: 0 }).where(eq(users.id, user.id));
  const token = randomToken();
  const csrfToken = randomToken();
  await db.insert(sessions).values({
    id: sha256(token),
    userId: user.id,
    csrfToken,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  await audit({ action: 'auth.sign_in', actorId: user.id, detail: require2fa ? '2FA verified' : null, ip });

  return {
    token,
    csrfToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function signOut(sessionId: string, userId: string, ip?: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  await audit({ action: 'auth.sign_out', actorId: userId, ip });
}

/** Changes the signed-in user's password and signs out their other sessions. */
export async function changePassword(userId: string, sessionId: string, current: string, next: string, ip?: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !(await verifyPassword(current, user.passwordHash))) throw badRequest('Current password is incorrect');
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, sessionId)));
  await audit({ action: 'user.password_changed', actorId: userId, targetLabel: user.email, ip });
}
