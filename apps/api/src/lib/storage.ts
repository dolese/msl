import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { env } from '../config/env.js';

export interface StoredObject {
  body: Readable;
  contentType: string;
}

export interface PhotoStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** null when the object does not exist */
  get(key: string): Promise<StoredObject | null>;
}

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Disk storage — development only (Railway's disk is wiped on every deploy). */
class LocalStorage implements PhotoStorage {
  constructor(private dir: string) {}
  private path(key: string) {
    const full = resolve(this.dir, key);
    if (!full.startsWith(resolve(this.dir))) throw new Error('Invalid storage key');
    return full;
  }
  async put(key: string, body: Buffer) {
    const full = this.path(key);
    mkdirSync(dirname(full), { recursive: true });
    await writeFile(full, body);
  }
  async get(key: string) {
    const full = this.path(key);
    if (!existsSync(full)) return null;
    return { body: createReadStream(full), contentType: TYPES[extname(full)] ?? 'application/octet-stream' };
  }
}

/**
 * Cloudflare R2 through its S3-compatible API. The bucket stays private:
 * photos are only ever streamed through the API, after the permission check.
 */
class R2Storage implements PhotoStorage {
  private client: S3Client;
  constructor(accountId: string, accessKeyId: string, secretAccessKey: string, private bucket: string, endpoint?: string) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint ?? `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }
  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return { body: res.Body as Readable, contentType: res.ContentType ?? 'application/octet-stream' };
    } catch (err) {
      if (err instanceof NoSuchKey) return null;
      throw err;
    }
  }
}

let instance: PhotoStorage | undefined;
export function storage(): PhotoStorage {
  if (!instance) {
    const e = env();
    instance = e.STORAGE_DRIVER === 'r2'
      ? new R2Storage(e.R2_ACCOUNT_ID!, e.R2_ACCESS_KEY_ID!, e.R2_SECRET_ACCESS_KEY!, e.R2_BUCKET!, e.R2_ENDPOINT)
      : new LocalStorage(e.UPLOAD_DIR);
  }
  return instance;
}
