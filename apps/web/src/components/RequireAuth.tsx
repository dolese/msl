import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { Permission } from '@msl/shared';
import { useAuth } from '../hooks/useAuth';
import { EmptyState, Loading } from './Feedback';

export function RequireAuth({ children, permission }: { children: ReactNode; permission?: Permission }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-screen"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !can(permission)) {
    return <div className="card"><EmptyState icon={ShieldAlert} title="No access">Your role doesn't include this page. Ask an administrator if you need it.</EmptyState></div>;
  }
  return <>{children}</>;
}
