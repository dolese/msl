import type { Response } from 'express';
import multer from 'multer';
import { pipeline } from 'node:stream/promises';
import { randomToken } from './crypto.js';
import { badRequest, notFound } from './http-error.js';
import { storage } from './storage.js';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** multipart parser: photo is kept in memory (≤ 5 MB) and then sent to storage. */
export const photoUpload = () =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    fileFilter: (_req, file, cb) =>
      file.mimetype in EXT ? cb(null, true) : cb(badRequest('Photo must be JPEG, PNG or WebP')),
  }).single('photo');

/** Checks the file's first bytes, so a renamed non-image is rejected. */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Validates and stores an uploaded photo. Returns its storage key. */
export async function savePhoto(file: Express.Multer.File): Promise<string> {
  const type = sniffImageType(file.buffer);
  if (!type) throw badRequest('Photo must be a real JPEG, PNG or WebP image');
  const key = `photos/${randomToken(16)}${EXT[type]}`; // never trust the client filename
  await storage().put(key, file.buffer, type);
  return key;
}

/** Streams a stored photo to the client. */
export async function sendPhoto(res: Response, key: string) {
  const obj = await storage().get(key);
  if (!obj) throw notFound('Photo not found');
  res.set({ 'Content-Type': obj.contentType, 'Cache-Control': 'private, no-store' });
  await pipeline(obj.body, res);
}
