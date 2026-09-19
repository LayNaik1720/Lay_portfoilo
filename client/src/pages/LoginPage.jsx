import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { SmartImage } from '../components/ui/Primitives.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSeo } from '../hooks/useSeo.js';

/** Shared two-column shell for sign in / register. */
export function AuthShell({ title, subtitle, image, children, aside }) {
  return (
    <div className="grid min-h-[calc(100svh-var(--header-height))] lg:grid-cols-2">
      {/* Image is decorative — hidden below lg so mobile isn't half-wasted. */}
      <div className="relative hidden bg-[var(--primary-dark)] lg:block">
        <SmartImage
          src={image}
          alt=""
          ratio="3/4"
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full"
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: 'linear-gradient(to top, rgba(21,41,31,0.72), rgba(21,41,31,0.15))' }}
        />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p className="font-[var(--font-display)] text-3xl font-light leading-tight text-white xl:text-4xl">
            {aside}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-14 sm:px-10 lg:px-14">
        <div className="w-full max-w-sm">
          <h1 className="display-lg mb-2">{title}</h1>
          <p className="mb-8 text-sm text-[var(--text-muted)]">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({ id, label, value, onChange, autoComplete, error, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="field pr-11"
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useSeo({ title: 'Sign in', noIndex: true });

  const redirectTo = location.state?.from?.pathname || '/account';

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      toast.success('Welcome back.');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Those details did not match our records.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track orders, save pieces and check out faster."
      image="/images/editorial/story.jpg"
      aside="Every piece has a maker, a place and a story."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email" type="email" className="field" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
          />
        </div>

        <PasswordField
          id="password" label="Password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="border border-[var(--error)] bg-[#f9efec] px-3.5 py-2.5 text-xs text-[var(--error)]" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : <>Sign in <ArrowRight size={14} /></>}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--text-muted)]">
        New here?{' '}
        <Link to="/register" className="link-underline text-[var(--text)]">Create an account</Link>
      </p>

      <div className="mt-8 border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4">
        <p className="eyebrow-sm mb-2 text-[var(--text-muted)]">Demo account</p>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          <code className="text-[var(--text)]">priya@example.com</code> ·{' '}
          <code className="text-[var(--text)]">Customer@123</code>
        </p>
        <button
          type="button"
          className="mt-3 text-xs link-underline"
          onClick={() => { setEmail('priya@example.com'); setPassword('Customer@123'); }}
        >
          Fill demo credentials
        </button>
      </div>
    </AuthShell>
  );
}
