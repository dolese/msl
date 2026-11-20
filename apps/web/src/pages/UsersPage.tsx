import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Lock, LockOpen, UserPlus, Users } from 'lucide-react';
import { inviteUserSchema, ROLES, type Role } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { Avatar } from '../components/Avatar';
import { Badge, capitalize, StatusBadge } from '../components/Badge';
import { Alert, EmptyState, Loading } from '../components/Feedback';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';

const ROLE_HELP: Record<Role, string> = {
  admin: 'Full access: users, audit log, ID reveal, export.',
  registrar: 'Registers people and creates share links.',
  viewer: 'Can view records only.',
};

export function UsersPage() {
  const { user: me } = useAuth();
  const { data, loading, reload } = useAsync(() => api.listUsers(), []);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [twoFactor, setTwoFactor] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { api.authConfig().then((c) => setTwoFactor(c.twoFactorRequired)).catch(() => undefined); }, []);

  const users = data ?? [];
  const shown = filter === 'all' ? users : users.filter((u) => u.role === filter);
  const close = useCallback(() => setInviting(false), []);

  async function unlock(id: string, email: string) {
    await api.unlockUser(id);
    setNotice(`${email} has been unlocked and can sign in again.`);
    reload();
  }

  return (
    <>
      <PageHeader title="Users & roles" description="People who can sign in to the registry, and what each can do."
        actions={<button className="btn btn-primary" onClick={() => { setInviting(true); setNotice(null); }}><UserPlus size={17} /> Add user</button>} />
      {notice && <div style={{ marginBottom: 16 }}><Alert kind="success">{notice}</Alert></div>}

      <div className="card">
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Filter by role">
            <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All<span className="count">{users.length}</span></button>
            {ROLES.map((r) => (
              <button key={r} aria-pressed={filter === r} onClick={() => setFilter(r)}>
                {capitalize(r)}s<span className="count">{users.filter((u) => u.role === r).length}</span>
              </button>
            ))}
          </div>
        </div>
        {loading && !data ? <Loading /> : shown.length === 0 ? <EmptyState icon={Users} title="No users in this group" /> : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>User</th><th>Role</th><th>Status</th>{twoFactor && <th>2FA</th>}<th aria-label="Actions" /></tr></thead>
                <tbody>
                  {shown.map((u) => (
                    <tr key={u.id}>
                      <td><div className="cell-person"><Avatar name={u.name} size={38} /><div><strong>{u.name}{u.id === me?.id && <span className="you"> (you)</span>}</strong><span>{u.email}</span></div></div></td>
                      <td><StatusBadge value={u.role} /></td>
                      <td>{u.locked ? <Badge tone="danger">Locked</Badge> : <Badge tone="success">Active</Badge>}</td>
                      {twoFactor && <td>{u.twoFactorEnabled ? <Badge tone="success">On</Badge> : <Badge tone="neutral">Off</Badge>}</td>}
                      <td className="num">{u.locked && <button className="btn btn-secondary btn-sm" onClick={() => unlock(u.id, u.email)}><LockOpen size={15} /> Unlock</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {shown.map((u) => (
                <li key={u.id} className="mobile-row">
                  <Avatar name={u.name} size={42} />
                  <div className="grow"><strong>{u.name}</strong><div className="meta">{u.email}</div></div>
                  {u.locked
                    ? <button className="btn btn-secondary btn-sm" onClick={() => unlock(u.id, u.email)}><Lock size={14} /> Unlock</button>
                    : <StatusBadge value={u.role} />}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {inviting && <InviteModal onClose={close} onDone={(email) => { setInviting(false); setNotice(`${email} was added. Give them the temporary password privately; they can change it under Account settings.`); reload(); }} />}
    </>
  );
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: (email: string) => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'registrar' as Role, password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = inviteUserSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the form.');
    setBusy(true);
    try { await api.inviteUser(parsed.data); onDone(parsed.data.email); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not add the user.'); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Add a user" description="They sign in with this email and the temporary password you set." onClose={onClose}>
      <form className="stack" style={{ gap: 16 }} onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="u-name">Full name</label>
          <input id="u-name" className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="u-email">Email address</label>
          <input id="u-email" className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field"><label htmlFor="u-role">Role</label>
          <select id="u-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{capitalize(r)}</option>)}
          </select>
          <span className="hint">{ROLE_HELP[form.role]}</span></div>
        <div className="field"><label htmlFor="u-pass">Temporary password</label>
          <input id="u-pass" className="input" type="text" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <span className="hint">At least 10 characters. Share it privately, not by group chat.</span></div>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add user'}</button>
        </div>
      </form>
    </Modal>
  );
}
