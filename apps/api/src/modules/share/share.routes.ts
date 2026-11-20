import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/http-error.js';
import { sendPhoto } from '../../lib/upload.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { resolveShareToken, toSharedDTO } from './share.service.js';

/** Public, unauthenticated, read-only. */
export const publicShareRouter = Router();
const tokenParam = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{32}$/) });

publicShareRouter.use(rateLimit({ windowMs: 60_000, max: 60 }));
publicShareRouter.use((_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  next();
});

publicShareRouter.get('/:token', async (req, res) => {
  const { token } = tokenParam.parse(req.params);
  const row = await resolveShareToken(token);
  await audit({ action: 'share.viewed', recordId: row.record.id, targetLabel: row.record.fullName, ip: req.ip });
  res.json(toSharedDTO(row, token));
});

publicShareRouter.get('/:token/photo', async (req, res) => {
  const { token } = tokenParam.parse(req.params);
  const row = await resolveShareToken(token);
  if (!row.record.photoPath) throw notFound();
  await sendPhoto(res, row.record.photoPath);
});
