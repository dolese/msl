import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { loginSchema } from '@msl/shared';
import { api, ApiError } from '../api/client';
import { BrandMark } from '../components/BrandMark';
import { Alert } from '../components/Feedback';
import { PasswordInput } from '../components/PasswordInput';
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
    if (twoFactor && !form.totp) return setError('Enter the 6-digit code from your authenticator app.');
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check your details.');
    setBusy(true);
    setError(null);
    try {
      await login(parsed.data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Check your connection and try again.');
      setForm((f) => ({ ...f, totp: '' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-brand" aria-hidden>
        <div className="mark-bg"><BrandMark size={520} tone="white" /></div>
        <div className="lockup">
          <BrandMark size={48} tone="white" />
          <div><strong>MSL Registry</strong><span>MSL Land Surveyors Company Limited</span></div>
        </div>
        <div className="pitch">
          <h2>Secure records for every person you register.</h2>
          <p>Register people with consent, protect their ID numbers, and share details safely with expiring links.</p>
          <ul>
            <li><CheckCircle2 size={18} /> National ID numbers encrypted and masked</li>
            <li><CheckCircle2 size={18} /> Every view, change and share is recorded</li>
            <li><CheckCircle2 size={18} /> Consent captured under Tanzania PDPA</li>
          </ul>
          <p className="tagline">Defining boundaries with excellence</p>
        </div>
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <div className="mobile-lockup">
            <BrandMark size={44} />
            <div><strong>MSL Registry</strong><span>MSL Land Surveyors Co. Ltd</span></div>
          </div>
          <h1>Sign in</h1>
          <p className="sub">Use the email and password your administrator gave you.</p>
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="input-icon"><Mail size={18} />
                <input id="email" className="input" type="email" autoComplete="username" placeholder="you@company.co.tz"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordInput id="password" withIcon autoComplete="current-password" placeholder="••••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {twoFactor && (
              <div className="field">
                <label htmlFor="totp">Authentication code</label>
                <input id="totp" className="input mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
                  value={form.totp} onChange={(e) => setForm({ ...form, totp: e.target.value.replace(/\D/g, '') })} />
                <span className="hint">The 6-digit code from your authenticator app.</span>
              </div>
            )}
            {error && <Alert kind="error">{error}</Alert>}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <div className="auth-foot"><ShieldCheck size={16} /> Encrypted connection · Accounts lock after 5 failed attempts</div>
        </div>
      </section>
    </div>
  );
}
