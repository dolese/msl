import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Check, CheckCircle2, Clock, Download, History, Link2, Plus, Users, X, type LucideIcon } from 'lucide-react';
import type { RecordDTO } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { Avatar } from '../components/Avatar';
import { Alert, EmptyState, Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { RejectModal } from '../components/RejectModal';
import { WeeklyChart } from '../components/WeeklyChart';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { describeEvent } from '../lib/audit-labels';
import { formatTime, shortName } from '../lib/format';

const TZ = 'Africa/Dar_es_Salaam';

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function relative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  const days = Math.round(mins / 1440);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function Kpi({ label, value, sub, icon: Icon, tone, trend, hint }: {
  label: string; value: string; sub: string; icon: LucideIcon; tone: string; trend?: 'up' | 'down'; hint?: string;
}) {
  return (
    <div className="card stat" title={hint}>
      <div className={`stat-icon tone-${tone}`}><Icon size={22} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className={trend === 'up' ? 'trend trend-up' : trend === 'down' ? 'trend trend-down' : 'trend'}>
          {trend === 'up' && <ArrowUpRight size={13} />}{trend === 'down' && <ArrowDownRight size={13} />}{sub}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, can } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.dashboard(), []);
  const [rejecting, setRejecting] = useState<RecordDTO | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });

  async function verify(r: RecordDTO) {
    try { await api.verify(r.id); setNotice({ ok: true, text: `${r.fullName} is now verified.` }); reload(); }
    catch (err) { setNotice({ ok: false, text: err instanceof ApiError ? err.message : 'Could not verify.' }); }
  }

  const header = (
    <PageHeader
      title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
      description={<>{today} · here is what needs your attention</>}
      actions={<>
        {can('records:export') && <a className="btn btn-secondary" href={api.exportUrl}><Download size={17} /> Export CSV</a>}
        {can('records:create') && <Link className="btn btn-primary" to="/records/new"><Plus size={17} /> New registration</Link>}
      </>}
    />
  );
  if (loading && !data) return <>{header}<Loading /></>;
  if (!data) return <>{header}<Alert kind="error">{error?.message ?? 'Could not load the dashboard.'}</Alert></>;

  const k = data.kpis;
  const diff = k.thisMonth - k.lastMonthToDate;
  const pct = k.lastMonthToDate > 0 ? Math.round((diff / k.lastMonthToDate) * 100) : null;
  const verifiedPct = k.total > 0 ? Math.round((k.verified / k.total) * 100) : 0;
  const canReview = can('records:verify');

  return (
    <>
      {header}
      {notice && <div style={{ marginBottom: 16 }}><Alert kind={notice.ok ? 'success' : 'error'}>{notice.text}</Alert></div>}

      <div className="stats">
        <Kpi label="Registered this month" value={k.thisMonth.toLocaleString()} icon={Users} tone="primary"
          sub={pct === null ? `${k.lastMonthToDate} last month` : `${pct >= 0 ? '+' : ''}${pct}% vs last month`}
          hint={`Compared with the same days of last month (${k.lastMonthToDate} registrations)`}
          trend={pct === null || pct === 0 ? undefined : pct > 0 ? 'up' : 'down'} />
        <Kpi label="Waiting for review" value={k.pending.toLocaleString()} icon={Clock} tone="warning"
          sub={k.pendingOlderThan2Days > 0 ? `${k.pendingOlderThan2Days} older than 2 days` : 'None older than 2 days'} />
        <Kpi label="Verified" value={`${verifiedPct}%`} icon={CheckCircle2} tone="success"
          sub={`${k.verified.toLocaleString()} of ${k.total.toLocaleString()} records`} />
        <Kpi label="Active share links" value={k.activeShareLinks.toLocaleString()} icon={Link2} tone="info"
          sub={k.shareLinksExpiringIn24h > 0 ? `${k.shareLinksExpiringIn24h} expire within 24 h` : 'None expiring soon'} />
      </div>

      <div className="grid-dash">
        <div className="card">
          <div className="card-header"><div><h2>Registrations per week</h2><p>Last 12 weeks · all registrars</p></div></div>
          <div className="card-body">
            {data.weekly.some((w) => w.count > 0)
              ? <WeeklyChart data={data.weekly} />
              : <EmptyState icon={Users} title="No registrations yet">The weekly trend appears after the first registrations.</EmptyState>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><h2><Clock size={18} /> {canReview ? 'Needs your review' : 'Waiting for review'}</h2><p>Oldest first</p></div>
            {k.pending > data.reviewQueue.length && <Link className="small" to="/records?status=pending">View all {k.pending}</Link>}
          </div>
          {data.reviewQueue.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up">No records are waiting for review.</EmptyState>
          ) : data.reviewQueue.map((r) => (
            <div key={r.id} className="event-row">
              <Avatar name={r.fullName} size={38} src={r.hasPhoto ? api.photoUrl(r.id) : null} />
              <div className="grow">
                <Link className="e-title" to={`/records/${r.id}`} style={{ color: 'var(--text)' }}>{r.fullName}</Link>
                <div className="e-sub">by {shortName(r.registeredBy.name)} · {relative(r.createdAt)}</div>
              </div>
              {canReview && (
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setRejecting(r)} aria-label={`Reject ${r.fullName}`}><X size={15} /><span className="hide-sm">Reject</span></button>
                  <button className="btn btn-success btn-sm" onClick={() => verify(r)} aria-label={`Verify ${r.fullName}`}><Check size={15} /><span className="hide-sm">Verify</span></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.activity && (
        <div className="card mt-16">
          <div className="card-header"><h2><History size={18} /> Recent activity</h2><Link className="small" to="/audit">Open audit log</Link></div>
          {data.activity.length === 0 ? <EmptyState icon={History} title="No activity yet" /> : data.activity.map((e) => {
            const d = describeEvent(e);
            return (
              <div key={e.id} className="event-row">
                <span className={`e-icon tone-${d.tone}`}><d.icon size={18} /></span>
                <div className="grow"><div className="e-title">{d.title}{d.subtitle && <span className="muted"> · {d.subtitle}</span>}</div></div>
                <span className="e-time">{relative(e.createdAt).includes('ago') ? formatTime(e.createdAt) : relative(e.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}

      {rejecting && (
        <RejectModal id={rejecting.id} name={rejecting.fullName} onClose={() => setRejecting(null)}
          onDone={() => { setNotice({ ok: true, text: `${rejecting.fullName} was rejected.` }); setRejecting(null); reload(); }} />
      )}
    </>
  );
}
