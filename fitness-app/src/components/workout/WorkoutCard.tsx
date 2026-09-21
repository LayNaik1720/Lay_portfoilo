import { Link, useNavigate } from 'react-router-dom'
import { Clock, Flame, ListOrdered, Play } from 'lucide-react'
import type { Workout } from '../../lib/types'
import { Badge, DifficultyBadge } from '../ui/Badge'
import { cn } from '../../lib/utils'
import { workoutCalories, workoutSets } from '../../lib/workouts'
import { useApp } from '../../store/AppStore'

export function WorkoutCard({
  workout,
  weightKg,
  className,
  recommended,
}: {
  workout: Workout
  weightKg: number
  className?: string
  recommended?: boolean
}) {
  const { actions } = useApp()
  const navigate = useNavigate()
  const calories = workoutCalories(workout, weightKg)

  const start = () => {
    actions.startSession(workout)
    navigate('/active-workout')
  }

  return (
    <article className={cn('card card-hover group flex flex-col overflow-hidden', className)}>
      <Link
        to={`/workouts/${workout.id}`}
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/60"
        aria-label={`${workout.title} — ${workout.durationMin} minutes, ${workout.difficulty}, view details`}
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={workout.cover}
            alt={`${workout.title} training session`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge solid className="bg-black/55 text-white backdrop-blur-sm">
              {workout.category}
            </Badge>
            {recommended ? (
              <Badge tone="brand" className="bg-emerald-500 text-emerald-950">
                For you
              </Badge>
            ) : null}
          </div>

          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
            <DifficultyBadge level={workout.difficulty} className="bg-black/55 text-white backdrop-blur-sm" />
            <span className="grid size-9 place-items-center rounded-full bg-emerald-500 text-emerald-950 transition-transform duration-300 group-hover:scale-110">
              <Play size={15} className="translate-x-px" aria-hidden />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 pb-3">
          <h3 className="font-display text-base font-bold sm:text-lg">{workout.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{workout.description}</p>

          <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-line pt-3.5 text-center">
            <div>
              <dt className="sr-only">Duration</dt>
              <dd className="flex flex-col items-center gap-0.5">
                <Clock size={15} className="text-muted" aria-hidden />
                <span className="text-xs font-bold tabular-nums">{workout.durationMin} min</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Estimated calories</dt>
              <dd className="flex flex-col items-center gap-0.5">
                <Flame size={15} className="text-orange-500" aria-hidden />
                <span className="text-xs font-bold tabular-nums">{calories} kcal</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Exercises</dt>
              <dd className="flex flex-col items-center gap-0.5">
                <ListOrdered size={15} className="text-muted" aria-hidden />
                <span className="text-xs font-bold tabular-nums">
                  {workout.exercises.length} · {workoutSets(workout)} sets
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </Link>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={start}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-bold text-emerald-950 transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98]"
        >
          <Play size={15} aria-hidden />
          Start Workout
        </button>
      </div>
    </article>
  )
}

export function WorkoutRow({
  workout,
  weightKg,
  onStart,
  className,
}: {
  workout: Workout
  weightKg: number
  onStart?: () => void
  className?: string
}) {
  const { actions } = useApp()
  const navigate = useNavigate()
  const calories = workoutCalories(workout, weightKg)

  const start = () => {
    actions.startSession(workout)
    onStart?.()
    navigate('/active-workout')
  }

  return (
    <div className={cn('card card-hover flex items-center gap-3 p-3 sm:gap-4 sm:p-4', className)}>
      <Link to={`/workouts/${workout.id}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <img src={workout.cover} alt="" loading="lazy" className="size-16 shrink-0 rounded-2xl object-cover sm:size-18" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold sm:text-base">{workout.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {workout.durationMin} min · {calories} kcal · {workout.exercises.length} exercises
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <DifficultyBadge level={workout.difficulty} />
            <Badge>{workout.category}</Badge>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={start}
        className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-emerald-950 transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label={`Start ${workout.title}`}
      >
        <Play size={18} aria-hidden />
      </button>
    </div>
  )
}
