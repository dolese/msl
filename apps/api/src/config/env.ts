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
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      console.error('Invalid environment:', z.treeifyError(parsed.error));
      process.exit(1);
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProd = () => env().NODE_ENV === 'production';
