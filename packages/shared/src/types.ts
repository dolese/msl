import type { Role } from './roles.js';
import type { RecordStatus } from './schemas.js';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  twoFactorEnabled: boolean;
  locked: boolean;
}

export interface RecordDTO {
  id: string;
  fullName: string;
  phone: string;
  nationalIdMasked: string;
  status: RecordStatus;
  hasPhoto: boolean;
  registeredBy: { id: string; name: string };
  consentAt: string;
  createdAt: string;
}

export const AUDIT_ACTIONS = [
  'auth.sign_in',
  'auth.sign_in_failed',
  'auth.sign_out',
  'auth.account_locked',
  'record.created',
  'record.updated',
  'record.verified',
  'record.id_revealed',
  'record.photo_downloaded',
  'record.exported',
  'share.created',
  'share.viewed',
  'user.invited',
  'user.role_changed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEventDTO {
  id: string;
  action: AuditAction;
  actor: { id: string; name: string } | null; // null = System
  targetLabel: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

/** What the public, unauthenticated share page receives. Never contains the full ID. */
export interface SharedRecordDTO {
  fullName: string;
  phone: string;
  nationalIdMasked: string;
  status: RecordStatus;
  registeredAt: string;
  photoUrl: string | null;
  expiresAt: string;
}
