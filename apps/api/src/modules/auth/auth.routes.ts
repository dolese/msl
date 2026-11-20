import { Router } from 'express';
import { changePasswordSchema, loginSchema } from '@msl/shared';
import { env, isProd } from '../../config/env.js';
import { requireAuth, SESSION_COOKIE } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { changePassword, SESSION_TTL_MS, signIn, signOut } from './auth.service.js';

export const authRouter = Router();

/** Public: tells the login page whether to ask for the 2FA code. */
authRouter.get('/config', (_req, res) => {
  res.json({ twoFactorRequired: env().REQUIRE_2FA });
});

authRouter.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 20 }), async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { token, csrfToken, user } = await signIn(input, req.ip);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
  res.json({ user, csrfToken });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, csrfToken: req.session!.csrfToken });
});

authRouter.post('/password', requireAuth, rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await changePassword(req.user!.id, req.session!.id, currentPassword, newPassword, req.ip);
  res.status(204).end();
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  await signOut(req.session!.id, req.user!.id, req.ip);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).end();
});
