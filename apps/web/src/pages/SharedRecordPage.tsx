import { useParams } from 'react-router-dom';
import { CalendarDays, Clock, Hash, IdCard, LinkIcon, MapPinned, Phone, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/Badge';
import { BrandMark } from '../components/BrandMark';
import { Alert, EmptyState, Loading } from '../components/Feedback';
import { useAsync } from '../hooks/useAsync';
import { formatDate, formatMaskedId, formatPhone, minutesUntil } from '../lib/format';

function expiresIn(iso: string) {
  const m = minutesUntil(iso);
  if (m >= 2880) return `${Math.round(m / 1440)} days`;
  if (m >= 120) return `${Math.round(m / 60)} hours`;
  return `${m} minute${m === 1 ? '' : 's'}`;
}

/** Public, read-only view opened from a share link. No sign-in, no actions. */
export function SharedRecordPage() {
  const { token = '' } = useParams();
  const { data, error, loading } = useAsync(() => api.getShared(token), [token]);

  return (
    <div className="public">
      <div className="public-inner">
        <div className="public-head">
          <BrandMark size={40} tone="white" />
          <div><strong>MSL Land Surveyors</strong><span>Shared registry record</span></div>
        </div>

        {loading ? <div className="card"><Loading /></div> : !data ? (
          <div className="card"><EmptyState icon={LinkIcon} title="This link is no longer available">{error?.message ?? 'It may have expired.'} Ask the person who shared it for a new link.</EmptyState></div>
        ) : (
          <>
            <div className="card public-card">
              <div className="profile-photo">
                {data.photoUrl ? <img src={data.photoUrl} alt={`Photo of ${data.fullName}`} /> : <Avatar name={data.fullName} size={96} />}
              </div>
              <div className="card-body">
                <div className="row between wrap" style={{ marginBottom: 6 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{data.fullName}</h1>
                  <StatusBadge value={data.status} />
                </div>
                <dl className="dl">
                  <div><dt><Hash size={17} /> Registration no.</dt><dd className="mono">{data.regNo}</dd></div>
                  <div><dt><Phone size={17} /> Phone</dt><dd>{formatPhone(data.phone)}</dd></div>
                  <div><dt><IdCard size={17} /> National ID</dt><dd className="masked">{formatMaskedId(data.nationalIdMasked)}</dd></div>
                  <div><dt><MapPinned size={17} /> Plots</dt><dd>{data.plots ?? '—'}</dd></div>
                  <div><dt><CalendarDays size={17} /> Registered</dt><dd>{formatDate(data.registeredAt)}</dd></div>
                </dl>
              </div>
            </div>
            <div className="stack mt-16" style={{ gap: 12 }}>
              <Alert kind="warning"><strong>Link expires in {expiresIn(data.expiresAt)}.</strong> After that it stops working.</Alert>
              <Alert kind="info">This is a secure, read-only view shared by an authorised MSL user. The ID number is masked and each view is recorded.</Alert>
            </div>
          </>
        )}
        <p className="public-foot"><ShieldCheck size={15} /> MSL secure registry · <Clock size={14} /> Time-limited link</p>
      </div>
    </div>
  );
}
