import { useEffect, useState, type FormEvent } from 'react';
import { inviteUserSchema, ROLES, type Role } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Chip } from '../components/Chip';
import { useAsync } from '../hooks/useAsync';

export function UsersPage() {
  const { data, loading, reload } = useAsync(() => api.listUsers(), []);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [twoFactor, setTwoFactor] = useState(false);
  useEffect(() => { api.authConfig().then((c) => setTwoFactor(c.twoFactorRequired)).catch(() => undefined); }, []);
  const users = data ?? [];
  const shown = filter === 'all' ? users : users.filter((u) => u.role === filter);

  const blank = { name: '', email: '', role: 'registrar' as Role, password: '' };
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function invite(e: FormEvent) {
    e.preventDefault();
    const parsed = inviteUserSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the form');
    try {
      await api.inviteUser(parsed.data);
      setCreated(`${parsed.data.email} can now sign in with the temporary password you set. Ask them to change it under Account.`);
      setForm(blank); setInviting(false); setError(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add user');
    }
  }

  return (
    <div className="page">
      <AppHeader title="Users and roles" actions={<button className="btn-sm btn-primary" onClick={() => { setInviting((v) => !v); setCreated(null); }}>{inviting ? 'Cancel' : '+ Invite'}</button>} />
      {created && <p className="card small text-green" role="status">✓ {created}</p>}
      {inviting && (
        <form className="card stack" onSubmit={invite} noValidate>
          <h3>Add a user</h3>
          <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{r[0]!.toUpperCase() + r.slice(1)}</option>)}
            </select>
          </label>
          <label>Temporary password
            <input type="text" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <span className="hint">At least 10 characters. Give it to the person privately; they change it under Account.</span>
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn-primary">Add user</button>
        </form>
      )}
      <div className="row gap-sm">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All ({users.length})</Chip>
        {ROLES.map((r) => (
          <Chip key={r} active={filter === r} onClick={() => setFilter(r)}>
            {r[0]!.toUpperCase() + r.slice(1)} ({users.filter((u) => u.role === r).length})
          </Chip>
        ))}
      </div>
      <ul className="card list">
        {loading && <li className="muted">Loading…</li>}
        {shown.map((u) => (
          <li key={u.id} className="list-row">
            <Avatar name={u.name} />
            <div className="grow">
              <strong>{u.name}</strong>
              <div className="muted small">{u.email}</div>
            </div>
            <div className="right">
              <Badge value={u.role} />
              {u.locked ? (
                <div className="small error">🔒 Locked</div>
              ) : twoFactor && (
                <div className={`small ${u.twoFactorEnabled ? 'text-green' : 'muted'}`}>2FA {u.twoFactorEnabled ? 'on' : 'off'}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
