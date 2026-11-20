import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';

/** Tiny in-memory fixed-window limiter. Swap for Redis when running >1 instance. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++entry.count > max) return next(new HttpError(429, 'Too many requests'));
    next();
  };
}
