import { z } from 'zod';

const base64Key = z
  .string()
  .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64-encoded');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  ID_ENCRYPTION_KEY: base64Key,
  ID_HASH_KEY: base64Key,
  /** 2FA (authenticator code at sign-in). Off for now; set to "true" to require it for everyone. */
  REQUIRE_2FA: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  WEB_ORIGIN: z.preprocess(
    (v) => v ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined),
    z.url().default('http://localhost:5173'),
  ),
  // Photo storage: "r2" = Cloudflare R2 (production), "local" = disk (development only)
  STORAGE_DRIVER: z.enum(['local', 'r2']).optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Optional override, e.g. a jurisdiction endpoint (…eu.r2.cloudflarestorage.com) or a local S3 mock in tests */
  R2_ENDPOINT: z.url().optional(),
  /** Directory with the built web app; served by the API in production. */
  WEB_DIST_DIR: z.string().optional(),
}).transform((e, ctx) => {
  const driver = e.STORAGE_DRIVER ?? (e.R2_BUCKET ? 'r2' : 'local');
  if (driver === 'r2') {
    for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const) {
      if (!e[k]) ctx.addIssue({ code: 'custom', path: [k], message: 'required when photos are stored in R2' });
    }
  } else if (e.NODE_ENV === 'production') {
    ctx.addIssue({ code: 'custom', path: ['STORAGE_DRIVER'], message: 'production must store photos in R2 (set the R2_* variables)' });
  }
  return { ...e, STORAGE_DRIVER: driver };
});

export type Env = z.output<typeof schema>;

let cached: Env | undefined;
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      console.error('Invalid environment:\n' + z.prettifyError(parsed.error));
      process.exit(1);
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProd = () => env().NODE_ENV === 'production';
