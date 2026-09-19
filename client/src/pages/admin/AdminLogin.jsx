import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useSeo({ title: 'Admin sign in', noIndex: true });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminLogin({ email: email.trim().toLowerCase(), password });
      toast.success('Signed in.');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Those credentials were not accepted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-svh place-items-center bg-[var(--primary-dark)] px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="font-[var(--font-display)] text-3xl font-light tracking-[0.3em] text-white"
          >
            AARAVA
          </Link>
          <p className="eyebrow-sm mt-3 text-white/45">Boutique administration</p>
        </div>

        <div className="bg-[var(--surface)] p-7">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck size={19} strokeWidth={1.4} className="text-[var(--primary)]" aria-hidden="true" />
            <h1 className="display-sm">Staff sign in</h1>
          </div>

          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label className="field-label" htmlFor="admin-email">Email</label>
              <input
                id="admin-email" type="email" className="field" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="admin-password">Password</label>
              <div className="relative">
                <input
                  id="admin-password" type={visible ? 'text' : 'password'} className="field pr-11"
                  required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                />
                <button
                  type="button" onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="border border-[var(--error)] bg-[#f9efec] px-3.5 py-2.5 text-xs text-[var(--error)]" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign in <ArrowRight size={14} /></>}
            </button>
          </form>

          <div className="mt-7 border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4">
            <p className="eyebrow-sm mb-2 text-[var(--text-muted)]">Demo credentials</p>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              <code className="text-[var(--text)]">admin@aarava.com</code> ·{' '}
              <code className="text-[var(--text)]">Admin@12345</code>
            </p>
            <button
              type="button" className="mt-3 text-xs link-underline"
              onClick={() => { setEmail('admin@aarava.com'); setPassword('Admin@12345'); }}
            >
              Fill demo credentials
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          <Link to="/" className="link-underline">Back to the storefront</Link>
        </p>
      </div>
    </div>
  );
}
