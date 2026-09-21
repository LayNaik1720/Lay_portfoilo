import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronDown, Clock, Flame, Pencil, Trash, Trophy } from 'lucide-react'
import type { WorkoutSession } from '../../lib/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/Progress'
import { cn, formatShortDate, round } from '../../lib/utils'
import { getExercise } from '../../lib/exercises'
import { useApp } from '../../store/AppStore'
import { useConfirm } from '../ui/Confirm'
import { useToast } from '../ui/Toast'

const FEELINGS: { value: 1 | 2 | 3 | 4 | 5; label: string; emoji: string }[] = [
  { value: 1, label: 'Tough', emoji: '😮‍💨' },
  { value: 2, label: 'Okay', emoji: '🙂' },
  { value: 3, label: 'Good', emoji: '💪' },
  { value: 4, label: 'Great', emoji: '🔥' },
  { value: 5, label: 'Beast mode', emoji: '🏆' },
]

export function SessionRow({ session, compact }: { session: WorkoutSession; compact?: boolean }) {
  const minutes = round(session.durationSec / 60, 0)
  return (
    <Link
      to="/history"
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface2"
    >
      <img src={session.cover} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{session.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span>{formatShortDate(session.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{minutes} min</span>
          {!compact ? (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{session.caloriesBurned} kcal</span>
            </>
          ) : null}
        </p>
      </div>
      <Badge tone={session.completion >= 90 ? 'brand' : session.completion >= 60 ? 'amber' : 'neutral'}>
        {session.completion}%
      </Badge>
    </Link>
  )
}

export function SessionItem({ session }: { session: WorkoutSession }) {
  const { actions } = useApp()
  const { confirm } = useConfirm()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete this workout?',
      description: 'This removes the session and its calories from your history.',
      confirmLabel: 'Delete session',
      tone: 'danger',
    })
    if (!ok) return
    actions.deleteSession(session.id)
    toast.success('Session deleted', 'Your statistics have been recalculated.')
  }

  const minutes = round(session.durationSec / 60, 0)

  return (
    <li className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <img src={session.cover} alt="" loading="lazy" className="size-14 shrink-0 rounded-2xl object-cover sm:size-16" />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-bold sm:text-base">{session.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={12} aria-hidden />
              {formatShortDate(session.date, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} aria-hidden />
              {minutes} min
            </span>
            <span className="flex items-center gap-1">
              <Flame size={12} className="text-orange-500" aria-hidden />
              {session.caloriesBurned} kcal
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar
              value={session.completion}
              size="sm"
              tone={session.completion >= 90 ? 'brand' : 'amber'}
              className="max-w-40"
              label="Session completion"
            />
            <span className="text-[11px] font-bold text-muted tabular-nums">
              {session.completedSets}/{session.totalSets} sets
            </span>
          </div>
        </button>
        <Button variant="ghost" size="icon" onClick={() => setOpen((prev) => !prev)} aria-label={open ? 'Hide details' : 'Show details'}>
          <ChevronDown size={18} className={cn('transition-transform duration-200', open && 'rotate-180')} />
        </Button>
      </div>

      {open ? (
        <div className="border-t border-line bg-surface2/50 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Rate this session</p>
            <Button variant="ghost" size="sm" icon={<Trash size={14} />} onClick={remove}>
              Delete
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {FEELINGS.map((feeling) => (
              <button
                key={feeling.value}
                type="button"
                onClick={() => actions.rateSession(session.id, feeling.value)}
                aria-pressed={session.feeling === feeling.value}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  session.feeling === feeling.value
                    ? 'border-emerald-500 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : 'border-line text-muted hover:text-ink',
                )}
              >
                <span aria-hidden>{feeling.emoji}</span>
                {feeling.label}
              </button>
            ))}
          </div>

          {session.note ? (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-surface p-3 text-xs text-ink2">
              <Pencil size={13} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              {session.note}
            </p>
          ) : null}

          <p className="mt-4 mb-2 text-xs font-bold tracking-wide text-muted uppercase">Exercises</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {session.exercises.map((row) => {
              const exercise = getExercise(row.exerciseId)
              const done = row.sets.filter((set) => set.done).length
              return (
                <li key={row.exerciseId} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">{exercise.name}</span>
                    <span className="text-[11px] text-muted">
                      {done}/{row.sets.length} sets · {row.sets[0]?.reps ?? 0} {row.unit === 'sec' ? 'sec' : 'reps'}
                    </span>
                  </span>
                  {done === row.sets.length ? (
                    <Trophy size={14} className="text-emerald-500" aria-label="Completed" />
                  ) : (
                    <span className="text-[11px] font-bold text-muted tabular-nums">{Math.round((done / row.sets.length) * 100)}%</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </li>
  )
}
