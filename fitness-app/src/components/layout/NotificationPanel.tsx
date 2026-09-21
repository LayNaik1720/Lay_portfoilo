import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BellOff, Check, Droplets, Dumbbell, Flame, Target, TrendingUp, Trophy, X } from 'lucide-react'
import { useApp } from '../../store/AppStore'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { cn, relativeTime } from '../../lib/utils'
import { TONES, type Tone } from '../ui/tokens'
import type { NotificationKind } from '../../lib/types'

const KIND_META: Record<NotificationKind, { icon: typeof Dumbbell; tone: Tone; to: string }> = {
  workout: { icon: Dumbbell, tone: 'brand', to: '/workouts' },
  water: { icon: Droplets, tone: 'water', to: '/water' },
  goal: { icon: Target, tone: 'violet', to: '/goals' },
  streak: { icon: Flame, tone: 'calorie', to: '/dashboard' },
  report: { icon: TrendingUp, tone: 'brand', to: '/progress' },
  achievement: { icon: Trophy, tone: 'amber', to: '/achievements' },
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, actions } = useApp()
  const navigate = useNavigate()
  const unread = data.notifications.filter((n) => !n.read).length

  const openNotification = (id: string, to: string) => {
    actions.markNotificationsRead(id)
    onClose()
    navigate(to)
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label="Notifications"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-101 flex w-full max-w-sm flex-col border-l border-line bg-surface shadow-pop"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold">Notifications</h2>
                <p className="text-xs text-muted">{unread ? `${unread} unread` : 'You are all caught up'}</p>
              </div>
              <div className="flex items-center gap-1">
                {data.notifications.length ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Check size={15} />}
                    onClick={() => actions.markNotificationsRead()}
                  >
                    Read
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notifications">
                  <X size={18} />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {data.notifications.length === 0 ? (
                <EmptyState
                  icon={<BellOff size={22} />}
                  title="No notifications yet"
                  description="Workout reminders, hydration nudges and streak alerts will show up here."
                  compact
                />
              ) : (
                <ul className="space-y-2">
                  {data.notifications.map((item) => {
                    const meta = KIND_META[item.kind]
                    const Icon = meta.icon
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(item.id, meta.to)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-200',
                            item.read ? 'border-line bg-surface hover:bg-surface2' : 'border-emerald-500/25 bg-emerald-500/6 hover:bg-emerald-500/10',
                          )}
                        >
                          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONES[meta.tone].soft, TONES[meta.tone].text)}>
                            <Icon size={17} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold">{item.title}</span>
                              {!item.read ? <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-label="Unread" /> : null}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">{item.body}</span>
                            <span className="mt-1 block text-[11px] font-medium text-muted/80">{relativeTime(item.at)}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {data.notifications.length ? (
              <footer className="border-t border-line p-3">
                <Button variant="ghost" full onClick={() => actions.clearNotifications()}>
                  Clear all notifications
                </Button>
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
