import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RecordStatus } from '@msl/shared';
import { api } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Chip } from '../components/Chip';
import { Pagination } from '../components/Pagination';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { formatPhone, formatShortDate } from '../lib/format';

const STATUS_CYCLE: (RecordStatus | undefined)[] = [undefined, 'verified', 'pending', 'rejected'];

export function RecordsPage() {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<RecordStatus | undefined>();
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAsync(() => api.listRecords({ q, status, page }), [q, status, page]);

  const nextStatus = () => {
    const i = STATUS_CYCLE.indexOf(status);
    setStatus(STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]);
    setPage(1);
  };

  return (
    <div className="page">
      <AppHeader title="Records" actions={<>
        {can('records:create') && <Link className="btn-sm btn-primary" to="/records/new">+ New</Link>}
        {can('records:export') && <a className="btn-sm btn-outline" href={api.exportUrl}>Export</a>}
      </>} />
      <input className="search" type="search" placeholder="🔍 Search by name or phone"
        value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      <div className="row gap-sm">
        <Chip active={!!status} onClick={nextStatus}>{status ? `Status: ${status}` : 'All status'}</Chip>
        <Chip>Registrar</Chip>
        <Chip>Date</Chip>
      </div>
      <ul className="card list">
        {loading && <li className="muted">Loading…</li>}
        {error && <li className="error">{error.message}</li>}
        {data?.items.map((r) => (
          <li key={r.id}>
            <Link to={`/records/${r.id}`} className="list-row">
              <Avatar name={r.fullName} size={40} />
              <div className="grow">
                <strong>{r.fullName}</strong>
                <div className="small">{formatPhone(r.phone)}</div>
                <div className="muted small">ID: ****-{r.nationalIdMasked.slice(-2)} <Badge value={r.status} /></div>
              </div>
              <div className="muted small right">
                {formatShortDate(r.createdAt)}<br />by {r.registeredBy.name.split(' ')[0]} {r.registeredBy.name.split(' ')[1]?.[0]}.
              </div>
            </Link>
          </li>
        ))}
        {data && data.items.length === 0 && <li className="muted">No records match.</li>}
      </ul>
      {data && <Pagination {...data} noun="records" onPage={setPage} />}
    </div>
  );
}
