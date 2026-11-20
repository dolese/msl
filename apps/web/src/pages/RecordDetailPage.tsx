import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hash, MapPinned, XCircle, CalendarDays, Check, CheckCircle2, Copy, Download, Eye, EyeOff, History, IdCard, Link2, Phone, ShieldCheck, UserRound } from 'lucide-react';
import type { ShareTtl } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/Badge';
import { Alert, EmptyState, Loading } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { CopyButton } from '../components/CopyButton';
import { RejectModal } from '../components/RejectModal';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { describeEvent } from '../lib/audit-labels';
import { formatDate, formatDateTimeLong, formatMaskedId, formatPhone, registeredByLabel } from '../lib/format';

const TTL_LABEL: Record<ShareTtl, string> = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days' };

export function RecordDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const record = useAsync(() => api.getRecord(id), [id]);
  const history = useAsync(() => api.history(id), [id]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [ttl, setTtl] = useState<ShareTtl>('24h');
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(null), 30_000); // re-mask automatically
    return () => clearTimeout(t);
  }, [revealed]);

  if (record.loading && !record.data) return <Loading />;
  if (!record.data) return <div className="card"><EmptyState icon={IdCard} title="Record not found">{record.error?.message}</EmptyState></div>;
  const r = record.data;

  async function run(fn: () => Promise<void>) {
    setActionError(null);
    try { await fn(); } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Something went wrong.'); }
  }
  const reveal = () => run(async () => {
    if (revealed) return setRevealed(null);
    setRevealed((await api.revealId(id)).nationalId);
    history.reload();
  });
  const verify = () => run(async () => { await api.verify(id); record.reload(); history.reload(); });
  const share = () => run(async () => {
    const res = await api.share(id, ttl);
    setLink(res); setCopied(false);
    await navigator.clipboard?.writeText(res.url).then(() => setCopied(true)).catch(() => undefined);
    history.reload();
  });

  return (
    <>
      <PageHeader
        back={{ to: '/records', label: 'Records' }}
        title={<span className="row wrap">{r.fullName} <StatusBadge value={r.status} /> <CopyButton value={r.fullName} label="Copy name" compact /></span>}
        description={`${r.regNo} · registered ${formatDate(r.createdAt)} by ${registeredByLabel(r)}`}
        actions={r.status === 'pending' && can('records:verify') && (<>
          <button className="btn btn-secondary" onClick={() => setRejecting(true)}><XCircle size={17} /> Reject</button>
          <button className="btn btn-success" onClick={verify}><CheckCircle2 size={17} /> Mark as verified</button>
        </>)}
      />
      {actionError && <div style={{ marginBottom: 16 }}><Alert kind="error">{actionError}</Alert></div>}

      <div className="grid-detail">
        <div className="card">
          <div className="profile-photo">
            {r.hasPhoto
              ? <img src={api.photoUrl(r.id)} alt={`Photo of ${r.fullName}`} />
              : <Avatar name={r.fullName} size={112} />}
            {r.hasPhoto && <a className="btn btn-secondary btn-sm photo-action" href={api.photoUrl(r.id, true)} download><Download size={15} /> Download</a>}
          </div>
          <div className="card-body">
            <dl className="dl">
              <div><dt><Hash size={17} /> Registration no.</dt><dd><span className="mono">{r.regNo}</span><CopyButton value={r.regNo} label="Copy registration number" /></dd></div>
              <div><dt><Phone size={17} /> Phone</dt><dd>{formatPhone(r.phone)}<CopyButton value={r.phone.replace(/^\+255/, '0')} label="Copy phone number" /></dd></div>
              <div>
                <dt><IdCard size={17} /> National ID</dt>
                <dd>
                  <span className={revealed ? 'mono' : 'masked'}>{revealed ? revealed.replace(/-/g, '') : formatMaskedId(r.nationalIdMasked)}</span>
                  <span className="row" style={{ gap: 8 }}>
                    {revealed && <CopyButton value={revealed.replace(/-/g, '')} label="Copy NIDA number" />}
                    {can('records:revealId') && (
                      <button className="btn btn-secondary btn-sm" onClick={reveal}>
                        {revealed ? <><EyeOff size={15} /> Hide</> : <><Eye size={15} /> Reveal</>}
                      </button>
                    )}
                  </span>
                </dd>
              </div>
              <div><dt><MapPinned size={17} /> Plots <span className="muted small">(vipande)</span></dt><dd>{r.plots ?? '—'}{r.plots != null && <CopyButton value={String(r.plots)} label="Copy number of plots" />}</dd></div>
              <div><dt><UserRound size={17} /> Registered by</dt><dd>{r.fieldOfficer ?? r.registeredBy.name}{r.fieldOfficer && <span className="muted small">via {r.registeredBy.name}</span>}</dd></div>
              <div><dt><CalendarDays size={17} /> Registered</dt><dd>{formatDate(r.createdAt)}</dd></div>
              <div><dt><ShieldCheck size={17} /> Consent</dt><dd>{formatDateTimeLong(r.consentAt)}</dd></div>
            </dl>
            {revealed && <p className="hint mt-16">The full ID hides again after 30 seconds. This reveal was recorded in the audit log.</p>}
          </div>
        </div>

        <div className="stack">
          {can('share:create') && (
            <div className="card">
              <div className="card-header">
                <div><h2><Link2 size={18} /> Share a read-only link</h2><p>The ID stays masked. The link stops working when it expires.</p></div>
              </div>
              <div className="card-body stack" style={{ gap: 14 }}>
                <div className="row between wrap">
                  <span className="label">Expires after</span>
                  <div className="segmented" role="group" aria-label="Link expiry">
                    {(Object.keys(TTL_LABEL) as ShareTtl[]).map((t) => (
                      <button key={t} type="button" aria-pressed={ttl === t} onClick={() => setTtl(t)}>{TTL_LABEL[t]}</button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary btn-block" onClick={share}><Link2 size={17} /> Create link</button>
                {link && (
                  <div className="field">
                    <div className="copy-field">
                      <input className="input" readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Share link" />
                      <button className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(link.url).then(() => setCopied(true))}>
                        {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                      </button>
                    </div>
                    <span className="hint">Valid until {formatDateTimeLong(link.expiresAt)}.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header"><h2><History size={18} /> Activity</h2></div>
            <div className="card-body">
              {history.data && history.data.length > 0 ? (
                <ol className="timeline">
                  {[...history.data].reverse().map((e) => {
                    const d = describeEvent(e);
                    return (
                      <li key={e.id}>
                        <span className={`t-icon tone-${d.tone}`}><d.icon size={16} /></span>
                        <div><div className="t-title">{d.title}</div><div className="t-meta">{formatDateTimeLong(e.createdAt)}{e.detail && ` · ${e.detail}`}</div></div>
                      </li>
                    );
                  })}
                </ol>
              ) : <p className="muted small">No activity yet.</p>}
            </div>
          </div>
        </div>
      </div>
      {rejecting && <RejectModal id={r.id} name={r.fullName} onClose={() => setRejecting(false)}
        onDone={() => { setRejecting(false); record.reload(); history.reload(); }} />}
    </>
  );
}
