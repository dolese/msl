import { useState, type FormEvent } from 'react';
import { changePasswordSchema } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { useAuth } from '../hooks/useAuth';

export function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setMsg({ ok: false, text: 'The new passwords do not match' });
    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) return setMsg({ ok: false, text: parsed.error.issues[0]?.message ?? 'Check the form' });
    setBusy(true);
    try {
      await api.changePassword(parsed.data);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg({ ok: true, text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not change password' });
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  return (
    <div className="page">
      <AppHeader title="Account" />
      <section className="card">
        <div className="row">
          <Avatar name={user.name} size={48} />
          <div className="grow">
            <strong>{user.name}</strong>
            <div className="muted small">{user.email}</div>
          </div>
          <Badge value={user.role} />
        </div>
      </section>
      <form className="card stack" onSubmit={onSubmit} noValidate>
        <h3>🔑 Change password</h3>
        <label>Current password
          <input type="password" autoComplete="current-password" value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        </label>
        <label>New password
          <input type="password" autoComplete="new-password" value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          <span className="hint">At least 10 characters</span>
        </label>
        <label>Repeat new password
          <input type="password" autoComplete="new-password" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </label>
        {msg && <p className={msg.ok ? 'text-green' : 'error'} role="status">{msg.text}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </div>
  );
}
