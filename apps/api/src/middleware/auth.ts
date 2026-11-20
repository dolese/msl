import type { NextFunction, Request, Response } from 'express';
import { and, eq, gt } from 'drizzle-orm';
import { can, type Permission } from '@msl/shared';
import { db } from '../db/client.js';
import { sessions, users } from '../db/schema.js';
import { sha256 } from '../lib/crypto.js';
import { forbidden, unauthorized } from '../lib/http-error.js';

export const SESSION_COOKIE = 'msl_sid';

/** Loads req.user from the session cookie if present. Does not reject. */
export async function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  const [row] = await db
    .select({ sid: sessions.id, csrf: sessions.csrfToken, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (row && !row.user.lockedAt) {
    req.session = { id: row.sid, csrfToken: row.csrf };
    req.user = { id: row.user.id, name: row.user.name, email: row.user.email, role: row.user.role };
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export const requirePermission =
  (permission: Permission) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!can(req.user.role, permission)) return next(forbidden());
    next();
  };
