import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { env } from '../config/env.js';
import { randomToken } from './crypto.js';
import { badRequest } from './http-error.js';

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function photoUpload() {
  const dir = env().UPLOAD_DIR;
  mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      // Never trust the client filename.
      filename: (_req, file, cb) => cb(null, randomToken(16) + (ALLOWED.get(file.mimetype) ?? extname(file.originalname))),
    }),
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    fileFilter: (_req, file, cb) =>
      ALLOWED.has(file.mimetype) ? cb(null, true) : cb(badRequest('Photo must be JPEG, PNG or WebP')),
  }).single('photo');
}
