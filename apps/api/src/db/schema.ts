import {
  boolean, customType, index, integer, pgEnum, pgTable, serial, text, timestamp, uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

export const roleEnum = pgEnum('role', ['admin', 'registrar', 'viewer']);
export const statusEnum = pgEnum('record_status', ['pending', 'verified', 'rejected']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** Sign-in names: username (set by the admin) and/or email */
  username: text('username').unique(),
  email: text('email').unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('viewer'),
  totpSecret: text('totp_secret'), // null => 2FA off
  failedLogins: integer('failed_logins').notNull().default(0),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // sha256 of the cookie token
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  csrfToken: text('csrf_token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const records = pgTable(
  'records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Running number behind the registration no. (MSL-2026-000027) */
    seq: serial('seq').notNull().unique(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    /** AES-256-GCM ciphertext (iv|tag|data) */
    nationalIdEnc: bytea('national_id_enc').notNull(),
    /** HMAC for duplicate detection without decrypting */
    nationalIdHash: text('national_id_hash').notNull().unique(),
    nationalIdLast2: text('national_id_last2').notNull(),
    photoPath: text('photo_path'),
    /** Idadi ya vipande */
    plots: integer('plots'),
    status: statusEnum('status').notNull().default('pending'),
    consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
    registeredById: uuid('registered_by_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('records_full_name_idx').on(t.fullName), index('records_phone_idx').on(t.phone)],
);

export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  recordId: uuid('record_id').notNull().references(() => records.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    action: text('action').notNull(),
    actorId: uuid('actor_id').references(() => users.id),
    recordId: uuid('record_id').references(() => records.id),
    targetLabel: text('target_label'),
    detail: text('detail'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_created_idx').on(t.createdAt), index('audit_record_idx').on(t.recordId)],
);
