import { Router } from 'express';
import { loginSchema } from '@msl/shared';
import { isProd } from '../../config/env.js';
import { requireAuth, SESSION_COOKIE } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { SESSION_TTL_MS, signIn, signOut } from './auth.service.js';

export const authRouter = Router();

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

authRouter.post('/logout', requireAuth, async (req, res) => {
  await signOut(req.session!.id, req.user!.id, req.ip);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).end();
});
