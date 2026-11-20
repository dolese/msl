import { asc, eq, sql } from 'drizzle-orm';
import type { DashboardDTO } from '@msl/shared';
import { db } from '../../db/client.js';
import { records, users } from '../../db/schema.js';
import { listAudit } from '../audit/audit.service.js';
import { toDTO } from '../records/records.service.js';

const TZ = 'Africa/Dar_es_Salaam';

export async function getDashboard(opts: { includeActivity: boolean }): Promise<DashboardDTO> {
  const local = sql`(now() at time zone ${TZ})`;
  const created = sql`(created_at at time zone ${TZ})`;

  const kpiRes = await db.execute(sql`
    select
      (select count(*) from records where ${created} >= date_trunc('month', ${local}))::int as "thisMonth",
      (select count(*) from records
         where ${created} >= date_trunc('month', ${local}) - interval '1 month'
           and ${created} <  ${local} - interval '1 month')::int as "lastMonthToDate",
      (select count(*) from records where status = 'pending')::int as "pending",
      (select count(*) from records where status = 'pending' and created_at < now() - interval '2 days')::int as "pendingOlderThan2Days",
      (select count(*) from records where status = 'verified')::int as "verified",
      (select count(*) from records)::int as "total",
      (select count(*) from share_links where not revoked and expires_at > now())::int as "activeShareLinks",
      (select count(*) from share_links where not revoked and expires_at > now()
         and expires_at < now() + interval '24 hours')::int as "shareLinksExpiringIn24h"
  `);

  const weeklyRes = await db.execute(sql`
    with weeks as (
      select generate_series(date_trunc('week', ${local}) - interval '11 weeks', date_trunc('week', ${local}), interval '1 week') as wk
    ), counts as (
      select date_trunc('week', ${created}) as wk, count(*)::int as n from records
      where ${created} >= date_trunc('week', ${local}) - interval '11 weeks' group by 1
    )
    select to_char(weeks.wk, 'YYYY-MM-DD') as "weekStart", coalesce(counts.n, 0)::int as "count"
    from weeks left join counts on counts.wk = weeks.wk order by weeks.wk
  `);

  const queue = await db
    .select({ record: records, registrar: { id: users.id, name: users.name } })
    .from(records).innerJoin(users, eq(users.id, records.registeredById))
    .where(eq(records.status, 'pending')).orderBy(asc(records.createdAt)).limit(5);

  return {
    kpis: kpiRes.rows[0] as unknown as DashboardDTO['kpis'],
    weekly: weeklyRes.rows as unknown as DashboardDTO['weekly'],
    reviewQueue: queue.map((r) => toDTO(r.record, r.registrar)),
    activity: opts.includeActivity ? (await listAudit({ days: 30, page: 1, pageSize: 6 })).items : null,
  };
}
