import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Mail, Sparkles } from 'lucide-react'
import { AuthShell } from '../components/layout/AuthShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useApp } from '../store/AppStore'
import { isEmail } from '../lib/utils'

export default function LoginPage() {
  const { actions, demoCredentials } = useApp()
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!isEmail(email)) nextErrors.email = 'Enter a valid email address.'
    if (!password) nextErrors.password = 'Password is required.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    window.setTimeout(() => {
      const result = actions.login(email, password)
      setLoading(false)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      toast.success('Welcome back!', 'Let’s make today count.')
      navigate('/dashboard')
    }, 420)
  }

  const loginAsDemo = () => {
    actions.loginDemo()
    toast.success('Demo account loaded', 'Alex’s training history is ready to explore.')
    navigate('/dashboard')
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep your streak alive and pick up where you left off."
      footer={
        <>
          New to Pulse?{' '}
          <Link to="/register" className="font-bold text-emerald-600 hover:underline dark:text-emerald-400">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail size={17} />}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          required
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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

        {formError ? (
          <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="size-4 rounded border-line accent-emerald-500" defaultChecked />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" size="lg" full loading={loading} icon={<LogIn size={18} />}>
          Login
        </Button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs font-semibold text-muted">OR</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          full
          onClick={() => {
            const result = actions.loginWithGoogle()
            if (result.ok) {
              toast.info('Signed in with Google', 'Demo flow — no data leaves your device.')
              navigate('/dashboard')
            }
          }}
          icon={
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A11.9 11.9 0 0 0 12 24Z"
              />
              <path fill="#FBBC05" d="M5.4 14.4a7.1 7.1 0 0 1 0-4.6V6.7H1.4a11.9 11.9 0 0 0 0 10.6l4-2.9Z" />
              <path
                fill="#EA4335"
                d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 11.9 11.9 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.8Z"
              />
            </svg>
          }
        >
          Continue with Google
        </Button>

        <button
          type="button"
          onClick={loginAsDemo}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/6 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/12 dark:text-emerald-300"
        >
          <Sparkles size={16} aria-hidden />
          Explore the demo account ({demoCredentials.email})
        </button>
      </form>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your password"
        description="We’ll email you a secure reset link."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!isEmail(forgotEmail)) {
                  toast.error('Enter a valid email', 'We need a valid address to send the link.')
                  return
                }
                setForgotOpen(false)
                toast.success('Reset link sent', `Check ${forgotEmail} for the next steps.`)
              }}
            >
              Send reset link
            </Button>
          </>
        }
      >
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={<Mail size={17} />}
          value={forgotEmail}
          onChange={(event) => setForgotEmail(event.target.value)}
        />
      </Modal>
    </AuthShell>
  )
}
