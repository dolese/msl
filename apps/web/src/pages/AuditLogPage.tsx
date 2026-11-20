import { useMemo, useState } from 'react';
import type { AuditEventDTO } from '@msl/shared';
import { api } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { Chip } from '../components/Chip';
import { Pagination } from '../components/Pagination';
import { useAsync } from '../hooks/useAsync';
import { describeEvent } from '../lib/audit-labels';
import { formatTime } from '../lib/format';

const DAY_OPTIONS = [1, 7, 30, 90];

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  if (d.toDateString() === today.toDateString()) return `TODAY, ${md}`;
  if (d.toDateString() === yesterday.toDateString()) return `YESTERDAY, ${md}`;
  return md;
}

export function AuditLogPage() {
  const [q, setQ] = useState('');
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const { data } = useAsync(() => api.listAudit({ q, days, page }), [q, days, page]);

  const groups = useMemo(() => {
    const map = new Map<string, AuditEventDTO[]>();
    for (const e of data?.items ?? []) {
      const key = dayLabel(e.createdAt);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map];
  }, [data]);

  return (
    <div className="page">
      <AppHeader title="Audit log" />
      <input className="search" type="search" placeholder="🔍 Search events" value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <div className="row gap-sm">
        <Chip active>All events</Chip>
        <Chip>All users</Chip>
        <Chip onClick={() => { setDays(DAY_OPTIONS[(DAY_OPTIONS.indexOf(days) + 1) % DAY_OPTIONS.length]!); setPage(1); }}>
          Last {days} {days === 1 ? 'day' : 'days'}
        </Chip>
      </div>
      {groups.map(([label, events]) => (
        <section key={label}>
          <h4 className="section-label">{label}</h4>
          <ul className="card list">
            {events.map((e) => {
              const d = describeEvent(e);
              return (
                <li key={e.id} className="list-row">
                  <span className={`event-icon tone-${d.tone}`} aria-hidden>{d.icon}</span>
                  <div className="grow">
                    <div className="small">{d.title}</div>
                    <div className="muted small">{d.subtitle}</div>
                  </div>
                  <span className="muted small">{formatTime(e.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {data && <Pagination {...data} noun="events" onPage={setPage} />}
    </div>
  );
}
