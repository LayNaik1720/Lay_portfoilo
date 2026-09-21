import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  ListOrdered,
  MapPin,
  Play,
  Repeat,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Badge, DifficultyBadge } from '../components/ui/Badge'
import { Button, LinkButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { FigureFrame } from '../components/exercise/ExerciseFigure'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useToast } from '../components/ui/Toast'
import { getExercise } from '../lib/exercises'
import { estimatedMinutes, getWorkout, workoutCalories, workoutSets } from '../lib/workouts'
import { cn } from '../lib/utils'

export default function WorkoutDetailPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const { actions, data } = useApp()
  const { weightKg } = useFitness()
  const toast = useToast()
  const [openExercise, setOpenExercise] = useState<string | null>(null)

  const workout = workoutId ? getWorkout(workoutId) : undefined

  if (!workout) {
    return (
      <div className="space-y-5">
        <PageHeader title="Workout not found" backTo="/workouts" backLabel="Back to workouts" />
        <EmptyState
          icon={<Dumbbell size={22} />}
          title="We couldn’t find that workout"
          description="It may have been renamed. Browse the full library to pick another session."
          action={<LinkButton to="/workouts" icon={<Play size={16} />}>Browse workouts</LinkButton>}
        />
      </div>
    )
  }

  const calories = workoutCalories(workout, weightKg || 75)
  const sets = workoutSets(workout)
  const history = data.sessions.filter((session) => session.workoutId === workout.id)
  const bestCompletion = history.length ? Math.max(...history.map((session) => session.completion)) : 0

  const start = (index = 0) => {
    actions.startSession(workout)
    if (index > 0) actions.patchSession({ index })
    toast.info(`${workout.title} started`, index > 0 ? `Jumping to ${getExercise(workout.exercises[index].exerciseId).name}` : 'Good luck — focus on form first.')
    navigate('/active-workout')
  }

  return (
    <div className="space-y-5">
      <PageHeader backTo="/workouts" backLabel="All workouts" className="mb-0" />

      {/* hero */}
      <Card className="overflow-hidden p-0">
        <div className="relative h-56 sm:h-72 lg:h-80">
          <img src={workout.cover} alt={`${workout.title} workout`} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
          <div className="absolute inset-x-4 bottom-4 space-y-2 sm:inset-x-6 sm:bottom-6">
            <div className="flex flex-wrap gap-2">
              <Badge solid className="bg-emerald-500 text-emerald-950">
                {workout.category}
              </Badge>
              <DifficultyBadge level={workout.difficulty} className="bg-black/50 text-white backdrop-blur" />
              <Badge className="bg-black/50 text-white backdrop-blur" icon={<Zap size={12} />}>
                {workout.intensity} intensity
              </Badge>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">{workout.title}</h1>
            <p className="max-w-2xl text-sm text-white/80">{workout.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
          {[
            { icon: Clock, label: 'Duration', value: `${workout.durationMin} min`, sub: `~${estimatedMinutes(workout)} min actual` },
            { icon: Flame, label: 'Calories', value: `${calories} kcal`, sub: 'personalised' },
            { icon: ListOrdered, label: 'Exercises', value: `${workout.exercises.length}`, sub: `${sets} total sets` },
            { icon: MapPin, label: 'Best for', value: workout.place.map((place) => place[0].toUpperCase() + place.slice(1)).join(', '), sub: workout.equipment.join(', ') },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-surface2/50 p-3">
              <item.icon size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden />
              <p className="mt-1.5 text-[11px] font-bold tracking-wide text-muted uppercase">{item.label}</p>
              <p className="text-sm font-bold">{item.value}</p>
              <p className="text-[11px] text-muted">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line p-4 sm:p-5">
          <Button size="lg" onClick={() => start(0)} icon={<Play size={18} />} className="flex-1 sm:flex-none">
            Start Workout
          </Button>
          <LinkButton to="/workouts" variant="outline" size="lg">
            Browse more
          </LinkButton>
          <div className="ml-auto flex items-center gap-4 text-xs font-semibold text-muted">
            {history.length ? (
              <>
                <span className="flex items-center gap-1.5">
                  <Repeat size={14} aria-hidden />
                  {history.length}× completed
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={14} aria-hidden />
                  best {bestCompletion}%
                </span>
              </>
            ) : (
              <span>First time? Take the first set easy.</span>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* exercise list */}
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="Exercise list"
            subtitle="Sets, reps and rest for every movement"
            icon={<ListOrdered size={18} className="text-emerald-600 dark:text-emerald-400" />}
          />
          <ol className="space-y-3">
            {workout.exercises.map((row, index) => {
              const exercise = getExercise(row.exerciseId)
              const open = openExercise === row.exerciseId
              return (
                <li key={`${row.exerciseId}-${index}`} className="overflow-hidden rounded-3xl border border-line bg-surface2/40">
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-xs font-bold text-muted tabular-nums">
                      {index + 1}
                    </span>
                    <div className="w-20 shrink-0 sm:w-24">
                      <FigureFrame pose={exercise.pose} tone={index % 3 === 0 ? 'brand' : index % 3 === 1 ? 'violet' : 'water'} aspect="aspect-[4/3]" label={`${exercise.name} demonstration`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold sm:text-base">{exercise.name}</p>
                        <Badge>{exercise.group}</Badge>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-ink2">
                        {row.sets} Sets × {row.reps} {row.unit === 'sec' ? 'sec' : 'Reps'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        <Timer size={12} aria-hidden />
                        Rest {row.restSec} seconds
                        {exercise.equipment !== 'None' ? ` · ${exercise.equipment}` : ' · bodyweight'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <Button size="sm" onClick={() => start(index)} icon={<Play size={14} />} aria-label={`Start exercise ${exercise.name}`}>
                        <span className="hidden sm:inline">Start Exercise</span>
                        <span className="sm:hidden">Start</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() => setOpenExercise(open ? null : row.exerciseId)}
                        aria-expanded={open}
                        className="flex items-center gap-1 text-[11px] font-semibold text-muted transition-colors hover:text-ink"
                      >
                        {open ? 'Hide' : 'How to'}
                        <ChevronDown size={12} className={cn('transition-transform duration-200', open && 'rotate-180')} aria-hidden />
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="border-t border-line bg-surface px-4 py-3">
                      <p className="text-xs font-bold tracking-wide text-muted uppercase">How to perform</p>
                      <ul className="mt-2 space-y-1.5">
                        {exercise.instructions.map((instruction, stepIndex) => (
                          <li key={instruction} className="flex gap-2 text-sm text-ink2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{stepIndex + 1}.</span>
                            {instruction}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 rounded-2xl bg-emerald-500/8 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Coach tip: {exercise.tip}
                      </p>
                      <p className="mt-2 text-[11px] text-muted">
                        Intensity {exercise.met} METs · about{' '}
                        {Math.round(((exercise.met * 3.5 * (weightKg || 75)) / 200) * 5)} kcal per 5 minutes at your body weight
                      </p>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </Card>

        {/* side info */}
        <div className="space-y-5">
          <Card className="p-5">
            <SectionHeader title="Session plan" icon={<Dumbbell size={18} className="text-violet-500" />} />
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 place-items-center rounded-xl bg-emerald-500/12 text-xs font-bold text-emerald-600 dark:text-emerald-400">1</span>
                <span>
                  <span className="block font-bold">Warm up 4–6 minutes</span>
                  <span className="text-xs text-muted">Mobility Prime is perfect for this session.</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 place-items-center rounded-xl bg-emerald-500/12 text-xs font-bold text-emerald-600 dark:text-emerald-400">2</span>
                <span>
                  <span className="block font-bold">Work through the list with intent</span>
                  <span className="text-xs text-muted">The player times your rest automatically.</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 place-items-center rounded-xl bg-emerald-500/12 text-xs font-bold text-emerald-600 dark:text-emerald-400">3</span>
                <span>
                  <span className="block font-bold">Log how it felt</span>
                  <span className="text-xs text-muted">Ratings feed your progress insights.</span>
                </span>
              </li>
            </ul>
            <LinkButton to="/workouts/warmup-mobility-prime" variant="outline" full className="mt-4">
              Open warm-up routine
            </LinkButton>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Muscles worked" icon={<TrendingUp size={18} className="text-water" />} />
            <div className="flex flex-wrap gap-2">
              {workout.focus.map((group) => (
                <Badge key={group} tone="brand">
                  {group}
                </Badge>
              ))}
              {workout.equipment.map((item) => (
                <Badge key={item} tone="neutral">
                  {item}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              Difficulty {workout.difficulty.toLowerCase()} · {workout.intensity.toLowerCase()} intensity · focuses on{' '}
              {workout.focus.join(', ').toLowerCase()}.
            </p>
          </Card>

          {history.length ? (
            <Card className="p-5">
              <SectionHeader title="Your history" subtitle={`${history.length} completed ${history.length === 1 ? 'session' : 'sessions'}`} />
              <ul className="space-y-2">
                {history.slice(0, 4).map((session) => (
                  <li key={session.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface2/50 px-3 py-2 text-xs">
                    <span className="font-semibold">
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-muted tabular-nums">
                      {Math.round(session.durationSec / 60)} min · {session.caloriesBurned} kcal
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{session.completion}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
