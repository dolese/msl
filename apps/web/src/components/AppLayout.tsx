import { NavLink, Outlet } from 'react-router-dom';
import { FolderOpen, LogOut, ScrollText, Settings, UserPlus, Users, type LucideIcon } from 'lucide-react';
import type { Permission } from '@msl/shared';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';
import { BrandLockup, BrandMark } from './BrandMark';

const NAV: { to: string; label: string; short: string; icon: LucideIcon; permission?: Permission; end?: boolean }[] = [
  { to: '/records', label: 'Records', short: 'Records', icon: FolderOpen, end: true },
  { to: '/records/new', label: 'New registration', short: 'Register', icon: UserPlus, permission: 'records:create' },
  { to: '/users', label: 'Users & roles', short: 'Users', icon: Users, permission: 'users:manage' },
  { to: '/audit', label: 'Audit log', short: 'Audit', icon: ScrollText, permission: 'audit:read' },
];

export function AppLayout() {
  const { user, can, logout } = useAuth();
  const items = NAV.filter((n) => !n.permission || can(n.permission));

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand"><BrandLockup /></div>
        <nav className="side-nav">
          <div className="side-label">Registry</div>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="side-link"><Icon size={19} /> {label}</NavLink>
          ))}
          <div className="side-label">You</div>
          <NavLink to="/account" className="side-link"><Settings size={19} /> Account settings</NavLink>
        </nav>
        {user && (
          <div className="sidebar-user">
            <Avatar name={user.name} size={36} dark />
            <div className="who"><strong>{user.name}</strong><span>{user.role}</span></div>
            <button className="icon-btn-dark" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <BrandMark size={30} tone="white" />
          <span className="brand-name">MSL Registry</span>
          <button className="icon-btn-dark push" onClick={logout} aria-label="Sign out"><LogOut size={20} /></button>
        </header>
        <main className="content"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        {items.map(({ to, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}><Icon size={21} />{short}</NavLink>
        ))}
        <NavLink to="/account"><Settings size={21} />Account</NavLink>
      </nav>
    </div>
  );
}
