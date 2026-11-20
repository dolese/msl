import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ShareTtl } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Chip } from '../components/Chip';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime, formatPhone, formatShortDate, shortName } from '../lib/format';
import { describeEvent } from '../lib/audit-labels';

const TTL_LABEL: Record<ShareTtl, string> = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days' };

export function RecordDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const record = useAsync(() => api.getRecord(id), [id]);
  const history = useAsync(() => api.history(id), [id]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [ttl, setTtl] = useState<ShareTtl>('1h');
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  if (record.loading) return <div className="center muted">Loading…</div>;
  if (!record.data) return <div className="center error">{record.error?.message ?? 'Not found'}</div>;
  const r = record.data;

  async function reveal() {
    if (revealed) return setRevealed(null);
    const { nationalId } = await api.revealId(id);
    setRevealed(nationalId);
    history.reload();
    setTimeout(() => setRevealed(null), 30_000); // auto re-mask
  }

  async function share() {
    try {
      const { url } = await api.share(id, ttl);
      await navigator.clipboard.writeText(url).catch(() => undefined);
      setShareMsg(`Link copied — expires in ${TTL_LABEL[ttl]}`);
      history.reload();
    } catch (err) {
      setShareMsg(err instanceof ApiError ? err.message : 'Could not create link');
    }
  }

  return (
    <div className="page">
      <AppHeader title="Record detail" back actions={<Badge value={r.status} />} />
      <div className="hero">
        <Avatar name={r.fullName} size={72} src={r.hasPhoto ? api.photoUrl(r.id) : null} />
        {r.hasPhoto && <a className="hero-action" href={api.photoUrl(r.id, true)} download>⬇ Download</a>}
      </div>

      <section className="card stack-sm">
        <h2>{r.fullName}</h2>
        <div>📞 {formatPhone(r.phone)}</div>
        <div className="row">
          <span className="mono">🪪 {revealed ?? r.nationalIdMasked}</span>
          {can('records:revealId') && (
            <button className="btn-sm btn-outline push-right" onClick={reveal}>{revealed ? '🙈 Hide' : '👁 Reveal'}</button>
          )}
        </div>
        <div className="muted small">👤 Registered by {shortName(r.registeredBy.name)}, {formatShortDate(r.createdAt)}</div>
        <div className="muted small">✓ Consent given {formatDateTime(r.consentAt)}</div>
        {r.status === 'pending' && can('records:verify') && (
          <button className="btn-sm btn-outline" onClick={() => api.verify(id).then(() => { record.reload(); history.reload(); })}>
            Mark verified
          </button>
        )}
      </section>

      {can('share:create') && (
        <section className="card stack-sm">
          <h3>🔗 Create share link</h3>
          <div className="row gap-sm">
            {(Object.keys(TTL_LABEL) as ShareTtl[]).map((t) => (
              <Chip key={t} active={ttl === t} onClick={() => setTtl(t)}>{TTL_LABEL[t]}</Chip>
            ))}
          </div>
          <button className="btn-primary" onClick={share}>Generate and copy link</button>
          {shareMsg && <p className="hint" role="status">{shareMsg}</p>}
        </section>
      )}

      <section className="card">
        <h3>🕘 Activity history</h3>
        <ol className="timeline">
          {history.data?.map((e, i) => (
            <li key={e.id} className={i === 0 ? 'first' : ''}>
              <div>{describeEvent(e).title}</div>
              <div className="muted small">{e.actor ? shortName(e.actor.name) : 'System'} — {formatDateTime(e.createdAt)}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
