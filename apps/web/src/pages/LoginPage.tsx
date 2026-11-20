import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/records';
  const [form, setForm] = useState({ email: '', password: '', totp: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    api.authConfig().then((c) => setTwoFactor(c.twoFactorRequired)).catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(twoFactor ? form : { email: form.email, password: form.password });
    if (twoFactor && !form.totp) return setError('Enter the 6-digit code');
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check your details');
    setBusy(true);
    setError(null);
    try {
      await login(parsed.data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed');
      setForm((f) => ({ ...f, totp: '' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page login">
      <header className="title-bar">MSL</header>
      <div className="logo-lg">MSL</div>
      <p className="muted center">Secure person registry</p>
      <form className="card stack" onSubmit={onSubmit} noValidate>
        <label>Email
          <input type="email" autoComplete="username" placeholder="you@company.co.tz"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Password
          <input type="password" autoComplete="current-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {twoFactor && (
          <label>One-time code (2FA)
            <input className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={form.totp} onChange={(e) => setForm({ ...form, totp: e.target.value.replace(/\D/g, '') })} />
            <span className="hint">Check your authenticator app</span>
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="hint">Account locks after 5 failed attempts</p>
        <p className="hint center">🔒 Protected by HTTPS + CSRF</p>
      </form>
    </div>
  );
}
