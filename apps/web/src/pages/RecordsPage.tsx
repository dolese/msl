import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Clock, Download, FolderOpen, Plus, Search, Users, XCircle } from 'lucide-react';
import { RECORD_STATUSES, type RecordStatus } from '@msl/shared';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';
import { capitalize, StatusBadge } from '../components/Badge';
import { EmptyState, Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatMaskedId, formatPhone } from '../lib/format';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function RecordsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const q = useDebounced(query);
  const [params] = useSearchParams();
  const initial = params.get('status');
  const [status, setStatus] = useState<RecordStatus | ''>(RECORD_STATUSES.includes(initial as RecordStatus) ? (initial as RecordStatus) : '');
  const [page, setPage] = useState(1);
  const list = useAsync(() => api.listRecords({ q, status: status || undefined, page }), [q, status, page]);
  const stats = useAsync(() => api.stats(), []);
  const filtered = !!q || !!status;

  const STAT_CARDS = [
    { label: 'Total records', value: stats.data?.total, icon: Users, tone: 'primary' },
    { label: 'Verified', value: stats.data?.verified, icon: CheckCircle2, tone: 'success' },
    { label: 'Pending review', value: stats.data?.pending, icon: Clock, tone: 'warning' },
    { label: 'Rejected', value: stats.data?.rejected, icon: XCircle, tone: 'danger' },
  ] as const;

  return (
    <>
      <PageHeader
        title="Records"
        description="Everyone registered in the MSL registry."
        actions={<>
          {can('records:export') && <a className="btn btn-secondary" href={api.exportUrl}><Download size={17} /> Export CSV</a>}
          {can('records:create') && <Link className="btn btn-primary" to="/records/new"><Plus size={17} /> New registration</Link>}
        </>}
      />

      <div className="stats">
        {STAT_CARDS.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card stat">
            <div className={`stat-icon tone-${tone}`}><Icon size={22} /></div>
            <div><div className="stat-label">{label}</div><div className="stat-value">{value ?? '—'}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="input-icon">
            <Search size={18} />
            <input className="input" type="search" placeholder="Search by name or phone number" aria-label="Search records"
              value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <select className="select" aria-label="Filter by status" value={status}
            onChange={(e) => { setStatus(e.target.value as RecordStatus | ''); setPage(1); }}>
            <option value="">All statuses</option>
            {RECORD_STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
          </select>
        </div>

        {list.loading && !list.data ? <Loading /> : list.error ? (
          <div className="card-body"><p className="field-error">{list.error.message}</p></div>
        ) : list.data && list.data.items.length === 0 ? (
          filtered
            ? <EmptyState icon={Search} title="No matching records">Try a different name, phone number or status.</EmptyState>
            : <EmptyState icon={FolderOpen} title="No records yet">Registered people will appear here.{can('records:create') && <> <Link to="/records/new">Register the first person</Link>.</>}</EmptyState>
        ) : list.data && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Person</th><th>Phone</th><th>National ID</th><th>Status</th><th>Registered</th><th aria-label="Open" /></tr></thead>
                <tbody>
                  {list.data.items.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/records/${r.id}`)}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={r.fullName} size={38} src={r.hasPhoto ? api.photoUrl(r.id) : null} />
                          <div><Link to={`/records/${r.id}`} onClick={(e) => e.stopPropagation()}><strong>{r.fullName}</strong></Link></div>
                        </div>
                      </td>
                      <td>{formatPhone(r.phone)}</td>
                      <td className="masked">{formatMaskedId(r.nationalIdMasked)}</td>
                      <td><StatusBadge value={r.status} /></td>
                      <td><div>{formatDate(r.createdAt)}</div><div className="small muted">by {r.registeredBy.name}</div></td>
                      <td className="num muted"><ChevronRight size={18} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {list.data.items.map((r) => (
                <li key={r.id}>
                  <Link className="mobile-row" to={`/records/${r.id}`}>
                    <Avatar name={r.fullName} size={42} src={r.hasPhoto ? api.photoUrl(r.id) : null} />
                    <div className="grow">
                      <strong>{r.fullName}</strong>
                      <div className="meta">{formatPhone(r.phone)} <StatusBadge value={r.status} /></div>
                    </div>
                    <ChevronRight size={18} className="muted" />
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination {...list.data} noun="records" onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}
