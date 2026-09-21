import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, User, UserPlus } from 'lucide-react'
import { AuthShell } from '../components/layout/AuthShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { useApp } from '../store/AppStore'
import { isEmail } from '../lib/utils'

const strengthLabels = ['Too short', 'Weak', 'Fair', 'Strong', 'Excellent']

export default function RegisterPage() {
  const { actions } = useApp()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => {
    const value = form.password
    let score = 0
    if (value.length >= 8) score += 1
    if (/[A-Z]/.test(value)) score += 1
    if (/[0-9]/.test(value)) score += 1
    if (/[^A-Za-z0-9]/.test(value)) score += 1
    if (value.length >= 12) score += 1
    return Math.min(score, 4)
  }, [form.password])

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.'
    if (!isEmail(form.email)) next.email = 'Enter a valid email address.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.'
    if (!accepted) next.accepted = 'Please accept the terms to continue.'
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    window.setTimeout(() => {
      const result = actions.register({ name: form.name, email: form.email, password: form.password })
      setLoading(false)
      if (!result.ok) {
        setErrors({ email: result.error })
        return
      }
      toast.success('Account created', 'Let’s personalise your plan in 60 seconds.')
      navigate('/onboarding')
    }, 480)
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your profile once and Pulse personalises every target, workout and insight."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald-600 hover:underline dark:text-emerald-400">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          placeholder="Alex Carter"
          autoComplete="name"
          icon={<User size={17} />}
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={<Mail size={17} />}
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />
        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            required
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded-lg p-1 text-muted transition-colors hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          {form.password ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1" aria-hidden>
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      index < strength ? 'bg-emerald-500' : 'bg-surface3'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-muted">{strengthLabels[strength]}</span>
            </div>
          ) : null}
        </div>
        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          required
        />

        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 size-4 rounded border-line accent-emerald-500"
            aria-invalid={Boolean(errors.accepted)}
          />
          <span>
            I agree to the <span className="font-semibold text-ink">Terms of Service</span> and{' '}
            <span className="font-semibold text-ink">Privacy Policy</span>.
          </span>
        </label>
        {errors.accepted ? (
          <p className="text-xs font-medium text-rose-500" role="alert">
            {errors.accepted}
          </p>
        ) : null}

        <Button type="submit" size="lg" full loading={loading} icon={<UserPlus size={18} />}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
