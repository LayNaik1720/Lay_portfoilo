import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { AuthShell, PasswordField } from './LoginPage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSeo } from '../hooks/useSeo.js';

const RULES = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v) => /[0-9]/.test(v), label: 'One number' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useSeo({ title: 'Create an account', noIndex: true });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.mobile && form.mobile.replace(/\D/g, '').length < 10) next.mobile = 'Enter a valid mobile number.';
    if (!RULES.every((r) => r.test(form.password))) next.password = 'Password does not meet the requirements.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        password: form.password,
      });
      toast.success('Your account is ready.');
      navigate('/account', { replace: true });
    } catch (err) {
      setErrors({ form: err.message || 'We could not create your account.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create an account"
      subtitle="Save your favourites, track orders and check out in seconds."
      image="/images/editorial/boutique.jpg"
      aside="Join a small circle of people who care how their clothes are made."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="field-label" htmlFor="name">Full name</label>
          <input
            id="name" className="field" required autoComplete="name"
            value={form.name} onChange={set('name')}
            aria-invalid={errors.name ? 'true' : undefined}
          />
          {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
        </div>

        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email" type="email" className="field" required autoComplete="email"
            value={form.email} onChange={set('email')}
            aria-invalid={errors.email ? 'true' : undefined}
          />
          {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
        </div>

        <div>
          <label className="field-label" htmlFor="mobile">Mobile <span className="normal-case tracking-normal">(optional)</span></label>
          <input
            id="mobile" type="tel" inputMode="tel" className="field" autoComplete="tel"
            value={form.mobile} onChange={set('mobile')}
            aria-invalid={errors.mobile ? 'true' : undefined}
          />
          {errors.mobile && <span className="field-error" role="alert">{errors.mobile}</span>}
        </div>

        <PasswordField
          id="password" label="Password" autoComplete="new-password" required
          value={form.password} onChange={set('password')}
          error={errors.password}
        />

        <ul className="space-y-1.5" aria-label="Password requirements">
          {RULES.map((rule) => {
            const ok = rule.test(form.password);
            return (
              <li key={rule.label} className="flex items-center gap-2 text-xs">
                <Check
                  size={13}
                  className={ok ? 'text-[var(--success)]' : 'text-[var(--border-strong)]'}
                  aria-hidden="true"
                />
                <span className={ok ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>{rule.label}</span>
              </li>
            );
          })}
        </ul>

        {errors.form && (
          <p className="border border-[var(--error)] bg-[#f9efec] px-3.5 py-2.5 text-xs text-[var(--error)]" role="alert">
            {errors.form}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Creating account…' : <>Create account <ArrowRight size={14} /></>}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link to="/login" className="link-underline text-[var(--text)]">Sign in</Link>
      </p>

      <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
        By creating an account you agree to our{' '}
        <Link to="/terms" className="link-underline">Terms</Link> and{' '}
        <Link to="/privacy" className="link-underline">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
