import { useState } from 'react';
import { ROLES, type Role } from '@msl/shared';
import { api } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Chip } from '../components/Chip';
import { useAsync } from '../hooks/useAsync';

export function UsersPage() {
  const { data, loading, reload } = useAsync(() => api.listUsers(), []);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const users = data ?? [];
  const shown = filter === 'all' ? users : users.filter((u) => u.role === filter);

  async function invite() {
    const email = prompt('Email address to invite');
    if (!email) return;
    const name = prompt('Full name') ?? email;
    const role = (prompt(`Role (${ROLES.join(' / ')})`, 'viewer') ?? 'viewer') as Role;
    await api.inviteUser({ name, email, role });
    reload();
  }

  return (
    <div className="page">
      <AppHeader title="Users and roles" actions={<button className="btn-sm btn-primary" onClick={invite}>+ Invite</button>} />
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
              <div className={`small ${u.twoFactorEnabled ? 'text-green' : 'muted'}`}>
                {u.locked ? '🔒 Locked' : `2FA ${u.twoFactorEnabled ? 'on' : 'off'}`}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
