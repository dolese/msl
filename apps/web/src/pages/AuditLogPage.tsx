import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import type { AuditEventDTO } from '@msl/shared';
import { api } from '../api/client';
import { EmptyState, Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { useAsync } from '../hooks/useAsync';
import { describeEvent } from '../lib/audit-labels';
import { formatTime } from '../lib/format';

const RANGES = [{ days: 1, label: 'Last 24 hours' }, { days: 7, label: 'Last 7 days' }, { days: 30, label: 'Last 30 days' }, { days: 90, label: 'Last 90 days' }];

function dayLabel(iso: string) {
  const d = new Date(iso);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const long = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (sameDay(d, new Date())) return `Today · ${long}`;
  if (sameDay(d, new Date(Date.now() - 86_400_000))) return `Yesterday · ${long}`;
  return long;
}

export function AuditLogPage() {
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(query), 300); return () => clearTimeout(t); }, [query]);
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => api.listAudit({ q, days, page }), [q, days, page]);

  const groups = useMemo(() => {
    const map = new Map<string, AuditEventDTO[]>();
    for (const e of data?.items ?? []) map.set(dayLabel(e.createdAt), [...(map.get(dayLabel(e.createdAt)) ?? []), e]);
    return [...map];
  }, [data]);

  return (
    <>
      <PageHeader title="Audit log" description="Every sign-in, registration, ID reveal, export and share link is recorded here." />
      <div className="card">
        <div className="toolbar" style={{ borderBottom: 0 }}>
          <div className="input-icon"><Search size={18} />
            <input className="input" type="search" placeholder="Search by person, user or action" aria-label="Search events"
              value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <select className="select" aria-label="Time range" value={days} onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }}>
            {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {loading && !data ? <Loading /> : groups.length === 0 ? (
        <div className="card mt-16"><EmptyState icon={ScrollText} title="No events in this period">Try a longer time range or a different search.</EmptyState></div>
      ) : groups.map(([label, events]) => (
        <section key={label}>
          <h2 className="day-label">{label}</h2>
          <div className="card">
            {events.map((e) => {
              const d = describeEvent(e);
              return (
                <div key={e.id} className="event-row">
                  <span className={`e-icon tone-${d.tone}`}><d.icon size={18} /></span>
                  <div className="grow"><div className="e-title">{d.title}</div>{d.subtitle && <div className="e-sub">{d.subtitle}</div>}</div>
                  <div className="e-time">{formatTime(e.createdAt)}{e.ip && <div className="hide-sm mono small">{e.ip}</div>}</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {data && <div className="card mt-16"><Pagination {...data} noun="events" onPage={setPage} /></div>}
    </>
  );
}
