import { useState, type FormEvent } from 'react';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { changePasswordSchema } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/Badge';
import { Alert } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../hooks/useAuth';

export function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setMsg({ ok: false, text: 'The new passwords do not match.' });
    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) return setMsg({ ok: false, text: parsed.error.issues[0]?.message ?? 'Check the form.' });
    setBusy(true);
    try {
      await api.changePassword(parsed.data);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg({ ok: true, text: 'Password changed. You have been signed out on your other devices.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not change the password.' });
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  return (
    <>
      <PageHeader title="Account settings" description="Your profile and sign-in details." />
      <div className="grid-detail">
        <div className="card card-pad">
          <div className="row" style={{ gap: 16 }}>
            <Avatar name={user.name} size={64} />
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{user.name}</h2>
              <div className="muted row" style={{ gap: 6 }}><Mail size={15} /> {user.username ?? user.email}{user.username && user.email && <span className="muted"> · {user.email}</span>}</div>
              <div style={{ marginTop: 8 }}><StatusBadge value={user.role} /></div>
            </div>
          </div>
          <div className="mt-16"><Alert kind="info">To change your name, email or role, ask an administrator.</Alert></div>
        </div>

        <form className="card" onSubmit={onSubmit} noValidate>
          <div className="card-header"><div><h2><KeyRound size={18} /> Change password</h2><p>Use at least 10 characters. A short sentence works well.</p></div></div>
          <div className="card-body stack" style={{ gap: 16 }}>
            <div className="field"><label htmlFor="cur">Current password</label>
              <PasswordInput id="cur" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></div>
            <div className="field"><label htmlFor="new">New password</label>
              <PasswordInput id="new" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></div>
            <div className="field"><label htmlFor="rep">Confirm new password</label>
              <PasswordInput id="rep" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></div>
            {msg && <Alert kind={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
            <div className="form-actions"><button className="btn btn-primary" disabled={busy}><ShieldCheck size={17} /> {busy ? 'Saving…' : 'Update password'}</button></div>
          </div>
        </form>
      </div>
    </>
  );
}
