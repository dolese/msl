import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRecordSchema } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { AppHeader } from '../components/AppHeader';

const MAX_PHOTO = 5 * 1024 * 1024;

export function NewRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', nationalId: '', consent: false });
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = createRecordSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) fe[String(issue.path[0])] ??= issue.message;
      return setErrors(fe);
    }
    if (photo && photo.size > MAX_PHOTO) return setErrors({ photo: 'Photo must be 5 MB or less' });

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
      setErrors({ form: err instanceof ApiError ? err.message : 'Could not save' });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: 'fullName' | 'phone' | 'nationalId', label: string, props: object = {}) => (
    <label>{label} *
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        aria-invalid={!!errors[key]} {...props} />
      {errors[key] && <span className="error small">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="page">
      <AppHeader title="New registration" />
      <form className="card stack" onSubmit={onSubmit} noValidate>
        <label className="dropzone">
          {photo ? <img src={URL.createObjectURL(photo)} alt="Preview" /> : <>📷 Take or upload<br /><span className="hint">photo (max 5 MB)</span></>}
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        {errors.photo && <span className="error small">{errors.photo}</span>}
        {field('fullName', 'Full name', { autoComplete: 'off' })}
        {field('phone', 'Phone number', { type: 'tel', placeholder: '+255 7XX XXX XXX' })}
        {field('nationalId', 'National ID number', { placeholder: 'YYYYMMDD-XXXXX-XXXXX-XX', autoComplete: 'off' })}
        <p className="hint">🔒 Encrypted at rest, masked by default</p>
        <label className={`consent${form.consent ? ' consent-on' : ''}`}>
          <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
          <span>This person agreed to have their photo and details saved and shared.
            <br /><span className="hint">Required under Tanzania PDPA</span></span>
        </label>
        {errors.consent && <span className="error small">{errors.consent}</span>}
        {errors.form && <p className="error" role="alert">{errors.form}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : '+ Save registration'}</button>
      </form>
    </div>
  );
}
