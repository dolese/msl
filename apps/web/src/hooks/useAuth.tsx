import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { can, type LoginInput, type Permission, type Role } from '@msl/shared';
import { api, setCsrfToken } from '../api/client';

type User = { id: string; name: string; email: string; role: Role };
interface AuthState {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  can: (p: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(({ user, csrfToken }) => { setCsrfToken(csrfToken); setUser(user); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user, csrfToken } = await api.login(input);
    setCsrfToken(csrfToken);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setCsrfToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can: (p) => !!user && can(user.role, p) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
