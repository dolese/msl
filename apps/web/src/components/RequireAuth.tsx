import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Permission } from '@msl/shared';
import { useAuth } from '../hooks/useAuth';

export function RequireAuth({ children, permission }: { children: ReactNode; permission?: Permission }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !can(permission)) return <div className="center muted">You don't have access to this page.</div>;
  return <>{children}</>;
}
