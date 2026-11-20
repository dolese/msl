import { z } from 'zod';
import { ROLES } from './roles.js';

/** Usernames: lowercase letters, numbers, dot, dash, underscore. */
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const usernameRule = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .refine((v) => USERNAME_RE.test(v), '3–32 characters: lowercase letters, numbers, dot, dash or underscore');

export const loginSchema = z.object({
  /** Email address (people) or username (team accounts) */
  login: z.string().trim().min(3, 'Enter your email or username').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Enter your password'),
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

/**
 * NIDA number: 20 digits, typed with or without dashes/spaces
 * (19881020456060000314 or 19881020-45606-00003-14). Always stored in the
 * dashed form so duplicate detection stays consistent.
 */
export const nationalId = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^\d{20}$/.test(v), 'NIDA number must have 20 digits')
  .transform((v) => `${v.slice(0, 8)}-${v.slice(8, 13)}-${v.slice(13, 18)}-${v.slice(18)}`);

/** Idadi ya vipande: number of plots, a whole number 0–999 */
export const plotsRule = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number({ error: 'Enter the number of plots' }).int('Whole numbers only').min(0, 'Cannot be negative').max(999, 'Too large'),
);

export const createRecordSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: tzPhone,
  nationalId,
  plots: plotsRule,
  consent: z.literal(true, { error: 'Consent is required under Tanzania PDPA' }),
});
export type CreateRecordInput = z.input<typeof createRecordSchema>;

export const updateRecordSchema = z.object({
  fullName: z.string().trim().min(3).max(120).optional(),
  phone: tzPhone.optional(),
  plots: plotsRule.optional(),
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

export const rejectRecordSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const SHARE_TTLS = { '1h': 3600, '24h': 86400, '7d': 604800 } as const;
export type ShareTtl = keyof typeof SHARE_TTLS;
export const createShareSchema = z.object({
  ttl: z.enum(Object.keys(SHARE_TTLS) as [ShareTtl, ...ShareTtl[]]),
});

export const passwordRule = z.string().min(10, 'Use at least 10 characters').max(200);

const accountBase = { name: z.string().trim().min(2).max(80), role: z.enum(ROLES), password: passwordRule };
/**
 * Admin creates a personal account (e.g. a field registrar). They sign in with the
 * username, or with the email address if one is given.
 */
export const inviteUserSchema = z.object({
  ...accountBase,
  username: usernameRule,
  email: z.union([z.literal(''), z.email()]).optional().transform((v) => (v ? v.toLowerCase() : undefined)),
});
export type InviteUserInput = z.input<typeof inviteUserSchema>;

export const resetPasswordSchema = z.object({ password: passwordRule });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordRule })
  .refine((v) => v.currentPassword !== v.newPassword, { path: ['newPassword'], message: 'Choose a different password' });

export const auditQuery = z.object({
  q: z.string().trim().max(100).optional(),
  userId: z.uuid().optional(),
  days: z.coerce.number().int().min(1).max(365).default(7),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
