import { NavLink, useNavigate } from 'react-router-dom'
import { Flame, LogOut, Zap } from 'lucide-react'
import { NAV_ITEMS } from './navigation'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/Progress'
import { useApp } from '../../store/AppStore'
import { useFitness } from '../../store/useFitness'
import { cn } from '../../lib/utils'
import { useConfirm } from '../ui/Confirm'

export function AppLogo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-2xl bg-emerald-500 text-emerald-950 shadow-[0_10px_24px_-12px_rgba(16,185,129,0.9)]">
        <Zap size={20} strokeWidth={2.6} aria-hidden />
      </span>
      {compact ? null : (
        <div className="leading-tight">
          <p className="font-display text-lg font-extrabold tracking-tight">Pulse</p>
          <p className="text-[11px] font-medium text-muted">Fitness OS</p>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, actions } = useApp()
  const { streak, week, targets } = useFitness()
  const { confirm } = useConfirm()
  const navigate = useNavigate()

  const groups = [
    { title: 'Train', items: NAV_ITEMS.filter((item) => item.group === 'primary') },
    { title: 'Track', items: NAV_ITEMS.filter((item) => item.group === 'tracking') },
  ]

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out of Pulse?',
      description: 'Your data stays saved on this device and will be here when you return.',
      confirmLabel: 'Log out',
      tone: 'danger',
    })
    if (ok) {
      actions.logout()
      navigate('/login')
    }
  }

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <AppLogo />

      <nav className="mt-7 flex-1 space-y-6 overflow-y-auto hide-scrollbar" aria-label="Main navigation">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-bold tracking-widest text-muted uppercase">{group.title}</p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                          : 'text-ink2 hover:bg-surface2 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'absolute top-1/2 -left-4 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500 transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0',
                          )}
                          aria-hidden
                        />
                        <item.icon size={19} strokeWidth={2.2} aria-hidden />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-line bg-surface2/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <Flame size={16} className="text-orange-500" aria-hidden />
              {streak.current} day streak
            </span>
            <span className="text-[11px] font-semibold text-muted">best {streak.longest}</span>
          </div>
          <p className="mt-2 mb-1.5 text-[11px] font-semibold text-muted">
            {week.sessions}/{targets.weeklyWorkouts} workouts this week
          </p>
          <ProgressBar value={week.goalProgress} size="sm" tone="brand" label="Weekly workout goal" />
        </div>

        {user ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
            <Avatar name={user.name} color={user.avatarColor} url={user.avatarUrl} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut size={16} />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
