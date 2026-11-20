import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { useAsync } from '../hooks/useAsync';
import { formatDate, formatPhone, minutesUntil } from '../lib/format';

/** Public, read-only view opened from a share link. No auth, no actions. */
export function SharedRecordPage() {
  const { token = '' } = useParams();
  const { data, error, loading } = useAsync(() => api.getShared(token), [token]);

  if (loading) return <div className="center muted">Loading…</div>;
  if (!data) {
    return (
      <div className="page">
        <header className="title-bar">MSL</header>
        <div className="card center">{error?.message ?? 'This link is invalid or has expired.'}</div>
      </div>
    );
  }

  const mins = minutesUntil(data.expiresAt);
  return (
    <div className="page">
      <header className="title-bar">MSL</header>
      <p className="pill-amber">Link expires in {mins >= 120 ? `${Math.round(mins / 60)} hours` : `${mins} minutes`}</p>
      <div className="card flush">
        <div className="hero"><Avatar name={data.fullName} size={64} src={data.photoUrl} /></div>
        <div className="stack-sm pad">
          <div className="row"><h2>{data.fullName}</h2><Badge value={data.status} /></div>
          <dl className="facts">
            <dt>📞 Phone</dt><dd>{formatPhone(data.phone)}</dd>
            <dt>🪪 National ID</dt><dd className="mono">{data.nationalIdMasked}</dd>
            <dt>📅 Registered</dt><dd>{formatDate(data.registeredAt)}</dd>
          </dl>
        </div>
      </div>
      <div className="card small muted">
        🔒 This is a secure, read-only view. ID number is masked. This link was shared by an
        authorized user and will expire automatically.
      </div>
      <p className="hint center">🛡 MSL secure registry</p>
    </div>
  );
}
