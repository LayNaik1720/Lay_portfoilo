import { Link } from 'react-router-dom'
import { Dumbbell, House } from 'lucide-react'
import { Button, LinkButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../store/AppStore'

export default function NotFoundPage() {
  const { user } = useApp()

  return (
    <div className="grid min-h-dvh place-items-center bg-page px-4">
      <Card className="max-w-lg p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <Dumbbell size={24} aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-3xl font-extrabold">404 — set not found</h1>
        <p className="mt-2 text-sm text-muted">
          This page skipped leg day and disappeared. Let’s get you back to training.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <LinkButton to={user ? '/dashboard' : '/login'} icon={<House size={16} />}>
            {user ? 'Back to dashboard' : 'Go to login'}
          </LinkButton>
          <Link to="/workouts">
            <Button variant="outline" full>
              Browse workouts
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
