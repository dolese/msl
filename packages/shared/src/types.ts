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
  /** Sign in with username, or email when set */
  email: string | null;
  username: string | null;
  role: Role;
  twoFactorEnabled: boolean;
  locked: boolean;
}

export interface RecordDTO {
  id: string;
  /** e.g. MSL-2026-000027 */
  regNo: string;
  fullName: string;
  phone: string;
  nationalIdMasked: string;
  status: RecordStatus;
  hasPhoto: boolean;
  /** Idadi ya vipande */
  plots: number | null;
  /** Msajili: the user whose account made the registration */
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
  'record.rejected',
  'record.id_revealed',
  'record.photo_downloaded',
  'record.exported',
  'share.created',
  'share.viewed',
  'user.invited',
  'user.role_changed',
  'user.password_reset',
  'user.password_changed',
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
  regNo: string;
  plots: number | null;
  fullName: string;
  phone: string;
  nationalIdMasked: string;
  status: RecordStatus;
  registeredAt: string;
  photoUrl: string | null;
  expiresAt: string;
}

export interface DashboardDTO {
  kpis: {
    thisMonth: number;
    /** Same days of last month (1st..today), for a fair comparison */
    lastMonthToDate: number;
    pending: number;
    pendingOlderThan2Days: number;
    verified: number;
    total: number;
    activeShareLinks: number;
    shareLinksExpiringIn24h: number;
  };
  /** Last 12 weeks (Monday start, Africa/Dar_es_Salaam), oldest first */
  weekly: { weekStart: string; count: number }[];
  /** Oldest pending records first */
  reviewQueue: RecordDTO[];
  /** Latest audit events; null when the user may not read the audit log */
  activity: AuditEventDTO[] | null;
}
