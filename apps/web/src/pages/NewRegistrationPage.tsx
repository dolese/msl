import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, IdCard, Lock, Phone, RefreshCw, User } from 'lucide-react';
import { createRecordSchema } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { Alert } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';

const MAX_PHOTO = 5 * 1024 * 1024;
type Errors = Partial<Record<'fullName' | 'phone' | 'nationalId' | 'consent' | 'photo' | 'form', string>>;

export function NewRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', nationalId: '', consent: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_PHOTO) return setErrors((e) => ({ ...e, photo: 'Photo must be 5 MB or smaller.' }));
    setErrors((e) => ({ ...e, photo: undefined }));
    setPhoto(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = createRecordSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Errors = {};
      for (const issue of parsed.error.issues) fe[String(issue.path[0]) as keyof Errors] ??= issue.message;
      return setErrors(fe);
    }
    const body = new FormData();
    body.set('fullName', parsed.data.fullName);
    body.set('phone', parsed.data.phone);
    body.set('nationalId', parsed.data.nationalId);
    body.set('consent', 'true');
    if (photo) body.set('photo', photo);
    setBusy(true);
    try {
      const record = await api.createRecord(body);
      navigate(`/records/${record.id}`, { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Could not save the registration. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  const set = (k: 'fullName' | 'phone' | 'nationalId') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  return (
    <>
      <PageHeader back={{ to: '/records', label: 'Records' }} title="New registration" description="Record a person's details and photo with their consent." />
      <form className="grid-form" onSubmit={onSubmit} noValidate>
        <div className="card">
          <div className="card-header"><h2><Camera size={18} /> Photo</h2><span className="hint">Optional</span></div>
          <div className="card-body">
            <label className="dropzone">
              {preview ? <img src={preview} alt="Selected photo preview" /> : (
                <>
                  <span className="dz-icon"><Camera size={24} /></span>
                  <strong>Take or upload a photo</strong>
                  <span className="hint">JPEG, PNG or WebP · up to 5 MB</span>
                </>
              )}
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
                onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>
            {photo && (
              <div className="row between mt-16">
                <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.name}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}><RefreshCw size={15} /> Remove</button>
              </div>
            )}
            {errors.photo && <p className="field-error mt-16">{errors.photo}</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2><User size={18} /> Personal details</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="fullName">Full name <span className="req">*</span></label>
                <div className="input-icon"><User size={18} />
                  <input id="fullName" className="input" autoComplete="off" placeholder="e.g. Amina Juma Hassan"
                    value={form.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} />
                </div>
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>
              <div className="field">
                <label htmlFor="phone">Phone number <span className="req">*</span></label>
                <div className="input-icon"><Phone size={18} />
                  <input id="phone" className="input" type="tel" placeholder="+255 7XX XXX XXX"
                    value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} />
                </div>
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
              <div className="field">
                <label htmlFor="nationalId">National ID (NIDA) <span className="req">*</span></label>
                <div className="input-icon"><IdCard size={18} />
                  <input id="nationalId" className="input mono" autoComplete="off" placeholder="YYYYMMDD-XXXXX-XXXXX-XX"
                    value={form.nationalId} onChange={set('nationalId')} aria-invalid={!!errors.nationalId} />
                </div>
                {errors.nationalId ? <span className="field-error">{errors.nationalId}</span>
                  : <span className="hint"><Lock size={12} style={{ verticalAlign: '-1px' }} /> Encrypted when saved and masked everywhere.</span>}
              </div>
              <div className="field full">
                <label className={`checkbox-card${form.consent ? ' checked' : ''}`}>
                  <input type="checkbox" checked={form.consent}
                    onChange={(e) => { setForm({ ...form, consent: e.target.checked }); setErrors({ ...errors, consent: undefined }); }} />
                  <div>
                    <strong>This person agreed to have their photo and details saved and shared.</strong>
                    <span>Required under the Tanzania Personal Data Protection Act. The time of consent is recorded.</span>
                  </div>
                </label>
                {errors.consent && <span className="field-error">{errors.consent}</span>}
              </div>
              {errors.form && <div className="full"><Alert kind="error">{errors.form}</Alert></div>}
              <div className="full form-actions">
                <Link className="btn btn-secondary" to="/records">Cancel</Link>
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save registration'}</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
