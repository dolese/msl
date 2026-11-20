import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AppLayout() {
  const { can, logout } = useAuth();
  return (
    <div className="shell">
      <main className="content"><Outlet /></main>
      <nav className="tabbar" aria-label="Main">
        <NavLink to="/records">Records</NavLink>
        {can('records:create') && <NavLink to="/records/new">New</NavLink>}
        {can('users:manage') && <NavLink to="/users">Users</NavLink>}
        {can('audit:read') && <NavLink to="/audit">Audit</NavLink>}
        <NavLink to="/account">Account</NavLink>
        <button className="link" onClick={logout}>Sign out</button>
      </nav>
    </div>
  );
}
