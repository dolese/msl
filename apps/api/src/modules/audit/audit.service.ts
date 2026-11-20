import { and, count, desc, eq, gte, ilike, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AuditAction, AuditEventDTO, Paginated } from '@msl/shared';
import { auditQuery } from '@msl/shared';
import type { z } from 'zod';
import { db } from '../../db/client.js';
import { auditEvents, users } from '../../db/schema.js';

const actor = alias(users, 'actor');

const toDTO = (r: { e: typeof auditEvents.$inferSelect; actor: { id: string; name: string; kind: 'person' | 'team' } | null }): AuditEventDTO => ({
  id: r.e.id,
  action: r.e.action as AuditAction,
  actor: r.actor,
  targetLabel: r.e.targetLabel,
  detail: r.e.detail,
  ip: r.e.ip,
  createdAt: r.e.createdAt.toISOString(),
});

export async function listAudit(q: z.infer<typeof auditQuery>): Promise<Paginated<AuditEventDTO>> {
  const filters: SQL[] = [gte(auditEvents.createdAt, new Date(Date.now() - q.days * 86_400_000))];
  if (q.userId) filters.push(eq(auditEvents.actorId, q.userId));
  if (q.q) {
    const like = `%${q.q.replace(/[%_\\]/g, '\\$&')}%`;
    filters.push(or(ilike(auditEvents.action, like), ilike(auditEvents.targetLabel, like), ilike(actor.name, like))!);
  }
  const where = and(...filters);
  const base = () => db.select({ e: auditEvents, actor: { id: actor.id, name: actor.name, kind: actor.kind } })
    .from(auditEvents).leftJoin(actor, eq(actor.id, auditEvents.actorId));

  const [rows, [totalRow]] = await Promise.all([
    base().where(where).orderBy(desc(auditEvents.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize),
    db.select({ n: count() }).from(auditEvents).leftJoin(actor, eq(actor.id, auditEvents.actorId)).where(where),
  ]);
  return { items: rows.map(toDTO), page: q.page, pageSize: q.pageSize, total: totalRow?.n ?? 0 };
}

export async function listRecordHistory(recordId: string): Promise<AuditEventDTO[]> {
  const rows = await db.select({ e: auditEvents, actor: { id: actor.id, name: actor.name, kind: actor.kind } })
    .from(auditEvents).leftJoin(actor, eq(actor.id, auditEvents.actorId))
    .where(eq(auditEvents.recordId, recordId)).orderBy(auditEvents.createdAt);
  return rows.map(toDTO);
}
