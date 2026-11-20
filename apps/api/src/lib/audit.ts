import type { AuditAction } from '@msl/shared';
import { db } from '../db/client.js';
import { auditEvents } from '../db/schema.js';
import { maskIp } from './mask-ip.js';

export interface AuditEntry {
  action: AuditAction;
  actorId?: string | null;
  recordId?: string | null;
  targetLabel?: string | null;
  detail?: string | null;
  ip?: string | null;
}

/** Append-only audit trail. Never log full national IDs or secrets here. */
export async function audit(entry: AuditEntry): Promise<void> {
  await db.insert(auditEvents).values({
    action: entry.action,
    actorId: entry.actorId ?? null,
    recordId: entry.recordId ?? null,
    targetLabel: entry.targetLabel ?? null,
    detail: entry.detail ?? null,
    ip: entry.ip ? maskIp(entry.ip) : null,
  });
}
