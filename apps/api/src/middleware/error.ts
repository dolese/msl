import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { MulterError } from 'multer';
import { HttpError } from '../lib/http-error.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: z.flattenError(err).fieldErrors });
  }
  if (err instanceof MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or less' : err.message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
