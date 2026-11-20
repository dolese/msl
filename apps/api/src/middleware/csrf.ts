import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { forbidden } from '../lib/http-error.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Synchronizer-token CSRF check: every state-changing request from a signed-in
 * user must echo the session's CSRF token in the X-CSRF-Token header.
 * (Session cookie is also SameSite=Strict — this is defence in depth.)
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method) || !req.session) return next();
  const sent = Buffer.from(String(req.get('x-csrf-token') ?? ''));
  const expected = Buffer.from(req.session.csrfToken);
  if (sent.length !== expected.length || !timingSafeEqual(sent, expected)) {
    return next(forbidden('Invalid CSRF token'));
  }
  next();
}
