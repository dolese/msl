import { z } from 'zod';
import { ROLES } from './roles.js';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  /** Only required when 2FA is switched on (REQUIRE_2FA=true on the API). */
  totp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code').optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Tanzania mobile number, normalised to +255XXXXXXXXX */
export const tzPhone = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+255|0)[67]\d{8}$/.test(v), 'Enter a valid Tanzanian phone number')
  .transform((v) => (v.startsWith('0') ? `+255${v.slice(1)}` : v));

/** NIDA format: YYYYMMDD-XXXXX-XXXXX-XX */
export const nationalId = z
  .string()
  .trim()
  .regex(/^\d{8}-\d{5}-\d{5}-\d{2}$/, 'Format: YYYYMMDD-XXXXX-XXXXX-XX');

export const createRecordSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: tzPhone,
  nationalId,
  consent: z.literal(true, { error: 'Consent is required under Tanzania PDPA' }),
});
export type CreateRecordInput = z.input<typeof createRecordSchema>;

export const updateRecordSchema = z.object({
  fullName: z.string().trim().min(3).max(120).optional(),
  phone: tzPhone.optional(),
});

export const RECORD_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const listRecordsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(RECORD_STATUSES).optional(),
  registrarId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const SHARE_TTLS = { '1h': 3600, '24h': 86400, '7d': 604800 } as const;
export type ShareTtl = keyof typeof SHARE_TTLS;
export const createShareSchema = z.object({
  ttl: z.enum(Object.keys(SHARE_TTLS) as [ShareTtl, ...ShareTtl[]]),
});

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  role: z.enum(ROLES),
});

export const auditQuery = z.object({
  q: z.string().trim().max(100).optional(),
  userId: z.uuid().optional(),
  days: z.coerce.number().int().min(1).max(365).default(7),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
