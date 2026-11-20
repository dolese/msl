import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LockOpen, RefreshCw, UserPlus, Users } from 'lucide-react';
import { inviteUserSchema, ROLES, type Role, type UserDTO } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { Avatar } from '../components/Avatar';
import { Badge, capitalize, StatusBadge } from '../components/Badge';
import { CopyButton } from '../components/CopyButton';
import { Alert, EmptyState, Loading } from '../components/Feedback';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { generatePassword } from '../lib/password';

const ROLE_HELP: Record<Role, string> = {
  admin: 'Full access: users, audit log, ID reveal, export.',
  registrar: 'Registers people and creates share links.',
  viewer: 'Can view records only.',
};

/** Sign-in details shown once after creating an account or resetting a password. */
type Credentials = { title: string; name: string; username: string; email: string | null; password: string };

const loginOf = (u: UserDTO) => u.username ?? u.email ?? '';
const credsOf = (title: string, u: UserDTO, password: string): Credentials => ({ title, name: u.name, username: u.username ?? u.email ?? '', email: u.username ? u.email : null, password });

export function UsersPage() {
  const { user: me } = useAuth();
  const { data, loading, reload } = useAsync(() => api.listUsers(), []);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [twoFactor, setTwoFactor] = useState(false);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<UserDTO | null>(null);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { api.authConfig().then((c) => setTwoFactor(c.twoFactorRequired)).catch(() => undefined); }, []);

  const users = data ?? [];
  const shown = filter === 'all' ? users : users.filter((u) => u.role === filter);
  const closeAdd = useCallback(() => setAdding(false), []);
  const closeReset = useCallback(() => setResetting(null), []);

  async function unlock(u: UserDTO) {
    await api.unlockUser(u.id);
    setNotice(`${u.name} has been unlocked and can sign in again.`);
    reload();
  }

  const actions = (u: UserDTO) => (
    <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
      {u.locked && <button className="btn btn-secondary btn-sm" onClick={() => unlock(u)}><LockOpen size={15} /> Unlock</button>}
      {u.id !== me?.id && <button className="btn btn-secondary btn-sm" onClick={() => { setResetting(u); setNotice(null); }}><KeyRound size={15} /> <span className="hide-sm">Reset password</span></button>}
    </div>
  );

  return (
    <>
      <PageHeader title="Users & roles" description="Everyone who can sign in. Registrars register people in the field; their name is saved as Msajili."
        actions={<button className="btn btn-primary" onClick={() => { setAdding(true); setNotice(null); }}><UserPlus size={17} /> Add user</button>} />
      {notice && <div style={{ marginBottom: 16 }}><Alert kind="success">{notice}</Alert></div>}

      <div className="card">
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Filter accounts">
            <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All<span className="count">{users.length}</span></button>
            {ROLES.map((r) => (
              <button key={r} aria-pressed={filter === r} onClick={() => setFilter(r)}>
                {capitalize(r)}s<span className="count">{users.filter((u) => u.role === r).length}</span>
              </button>
            ))}
          </div>
        </div>
        {loading && !data ? <Loading /> : shown.length === 0 ? <EmptyState icon={Users} title="No accounts in this group" /> : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Status</th>{twoFactor && <th>2FA</th>}<th aria-label="Actions" /></tr></thead>
                <tbody>
                  {shown.map((u) => (
                    <tr key={u.id}>
                      <td><div className="cell-person"><Avatar name={u.name} size={38} />
                        <div><strong>{u.name}{u.id === me?.id && <span className="you"> (you)</span>}</strong>{u.email && u.username && <span>{u.email}</span>}</div></div></td>
                      <td className={u.username ? 'mono' : ''}>{loginOf(u)}</td>
                      <td><StatusBadge value={u.role} /></td>
                      <td>{u.locked ? <Badge tone="danger">Locked</Badge> : <Badge tone="success">Active</Badge>}</td>
                      {twoFactor && <td>{u.twoFactorEnabled ? <Badge tone="success">On</Badge> : <Badge tone="neutral">Off</Badge>}</td>}
                      <td className="num">{actions(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mobile-list">
              {shown.map((u) => (
                <li key={u.id} className="mobile-row">
                  <Avatar name={u.name} size={42} />
                  <div className="grow">
                    <strong>{u.name}</strong>
                    <div className="meta">{loginOf(u)} · {capitalize(u.role)}{u.locked && <Badge tone="danger">Locked</Badge>}</div>
                  </div>
                  {actions(u)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {adding && <AddAccountModal onClose={closeAdd} onDone={(c) => { setAdding(false); setCreds(c); reload(); }} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={closeReset} onDone={(c) => { setResetting(null); setCreds(c); reload(); }} />}
      {creds && <CredentialsModal creds={creds} onClose={() => setCreds(null)} />}
    </>
  );
}

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label htmlFor="acc-pass">Password</label>
      <div className="copy-field">
        <input id="acc-pass" className="input mono" type="text" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn btn-secondary" onClick={() => onChange(generatePassword())}><RefreshCw size={15} /> Generate</button>
      </div>
      <span className="hint">At least 10 characters. You'll see it once more on the next screen to copy and hand over.</span>
    </div>
  );
}

/** "Paul Lubinza" -> "paul.lubinza" */
const suggestUsername = (name: string) =>
  name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 32);

function AddAccountModal({ onClose, onDone }: { onClose: () => void; onDone: (c: Credentials) => void }) {
  const [form, setForm] = useState({ name: '', username: '', email: '', role: 'registrar' as Role, password: generatePassword() });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Keep suggesting a username from the name until the admin edits it themselves
  const setName = (name: string) =>
    setForm((f) => ({ ...f, name, username: f.username === '' || f.username === suggestUsername(f.name) ? suggestUsername(name) : f.username }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = inviteUserSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the form.');
    setBusy(true);
    try {
      const u = await api.inviteUser(form);
      onDone(credsOf('User created', u, form.password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the user.');
      setBusy(false);
    }
  }

  return (
    <Modal title="Add user" description="Create the account here, then give the sign-in details to the person privately." onClose={onClose}>
      <form className="stack" style={{ gap: 16 }} onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="acc-name">Full name</label>
          <input id="acc-name" className="input" autoFocus placeholder="e.g. Paul Lubinza" value={form.name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="acc-user">Username</label>
            <input id="acc-user" className="input mono" autoCapitalize="none" autoComplete="off" placeholder="paul.lubinza" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
            <span className="hint">Used to sign in. Letters, numbers, dot, dash.</span></div>
          <div className="field"><label htmlFor="acc-email">Email <span className="muted">(optional)</span></label>
            <input id="acc-email" className="input" type="email" placeholder="name@company.co.tz" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <span className="hint">They can sign in with this too.</span></div>
        </div>
        <div className="field"><label htmlFor="acc-role">Role</label>
          <select id="acc-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{capitalize(r)}</option>)}
          </select>
          <span className="hint">{ROLE_HELP[form.role]}</span></div>
        <PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })} />
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onDone }: { user: UserDTO; onClose: () => void; onDone: (c: Credentials) => void }) {
  const [password, setPassword] = useState(generatePassword());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError('Use at least 10 characters.');
    setBusy(true);
    try {
      await api.resetUserPassword(user.id, password);
      onDone(credsOf('Password reset', user, password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset the password.');
      setBusy(false);
    }
  }
  return (
    <Modal title={`Reset password for ${user.name}`} description="The old password stops working and the account is signed out on all devices." onClose={onClose}>
      <form className="stack" style={{ gap: 16 }} onSubmit={submit} noValidate>
        <PasswordField value={password} onChange={setPassword} />
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}><KeyRound size={16} /> {busy ? 'Saving…' : 'Set new password'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CredentialsModal({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const url = window.location.origin;
  const message = `MSL Registry sign-in\nName: ${creds.name}\nUsername: ${creds.username}\nPassword: ${creds.password}\nOpen: ${url}\nPlease change your password after signing in (Account settings).`;
  return (
    <Modal title={creds.title} description="Give these details to the person privately. The password won't be shown again." onClose={onClose}>
      <div className="cred">
        <div className="cred-row"><span className="k">Name</span><span className="v">{creds.name}</span></div>
        <div className="cred-row"><span className="k">Username</span><span className="v mono">{creds.username}</span><CopyButton value={creds.username} label="Copy username" /></div>
        {creds.email && <div className="cred-row"><span className="k">Email</span><span className="v">{creds.email}</span></div>}
        <div className="cred-row"><span className="k">Password</span><span className="v mono">{creds.password}</span><CopyButton value={creds.password} label="Copy password" /></div>
        <div className="cred-row"><span className="k">Sign-in link</span><span className="v small">{url}</span><CopyButton value={url} label="Copy link" /></div>
      </div>
      <Alert kind="warning">Send it in a private message, not in a group chat. Ask them to change the password after signing in.</Alert>
      <div className="form-actions">
        <CopyButton value={message} label="Copy all as a message" text="Copy all as a message" />
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
