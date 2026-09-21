import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Trophy,
  X,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ProgressRing } from '../components/ui/Progress'
import { Confetti } from '../components/ui/Confetti'
import { ExerciseFigure } from '../components/exercise/ExerciseFigure'
import { useApp } from '../store/AppStore'
import { useConfirm } from '../components/ui/Confirm'
import { useToast } from '../components/ui/Toast'
import { getExercise } from '../lib/exercises'
import { getWorkout } from '../lib/workouts'
import { cn, formatTime, round } from '../lib/utils'
import { useMediaQuery } from '../hooks/useIsDark'

const FEELINGS: { value: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { value: 1, emoji: '😮‍💨', label: 'Tough' },
  { value: 2, emoji: '🙂', label: 'Okay' },
  { value: 3, emoji: '💪', label: 'Solid' },
  { value: 4, emoji: '🔥', label: 'Great' },
  { value: 5, emoji: '🏆', label: 'Beast' },
]

export default function ActiveWorkoutPage() {
  const { data, actions } = useApp()
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const toast = useToast()

  const active = data.activeSession
  const [elapsed, setElapsed] = useState(active ? Math.round((Date.now() - new Date(active.startedAt).getTime()) / 1000) : 0)
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState(45)
  const [summary, setSummary] = useState<{ id: string; title: string; durationSec: number; caloriesBurned: number; completedSets: number; totalSets: number; completion: number } | null>(null)
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5 | null>(null)

  const paused = active?.paused ?? false
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  /* elapsed timer */
  useEffect(() => {
    if (!active || paused || summary) return
    const timer = window.setInterval(() => setElapsed((prev) => prev + 1), 1000)
    return () => window.clearInterval(timer)
  }, [active, paused, summary])

  /* rest countdown */
  useEffect(() => {
    if (restLeft === null) return
    if (restLeft <= 0) {
      setRestLeft(null)
      toast.info('Rest complete', 'Time for the next set.')
      return
    }
    if (paused) return
    const timer = window.setTimeout(() => setRestLeft((prev) => (prev === null ? null : prev - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [restLeft, paused, toast])

  const exerciseIndex = active?.index ?? 0
  const currentRow = active?.exercises[exerciseIndex]
  const exercise = useMemo(() => (currentRow ? getExercise(currentRow.exerciseId) : null), [currentRow])
  const currentSetIndex = currentRow ? currentRow.sets.findIndex((set) => !set.done) : -1
  const allSetsDone = currentRow ? currentRow.sets.every((set) => set.done) : false

  const progress = useMemo(() => {
    if (!active) return { done: 0, total: 0, ratio: 0 }
    const total = active.exercises.reduce((acc, row) => acc + row.sets.length, 0)
    const done = active.exercises.reduce((acc, row) => acc + row.sets.filter((set) => set.done).length, 0)
    return { done, total, ratio: total ? (done / total) * 100 : 0 }
  }, [active])

  const goTo = useCallback(
    (index: number) => {
      if (!active) return
      const clamped = Math.max(0, Math.min(index, active.exercises.length - 1))
      actions.patchSession({ index: clamped })
      setRestLeft(null)
    },
    [active, actions],
  )

  const completeSet = useCallback(() => {
    if (!active || !currentRow) return
    const nextSets = currentRow.sets.map((set, index) => (index === currentSetIndex ? { ...set, done: true } : set))
    const exercises = active.exercises.map((row, index) => (index === exerciseIndex ? { ...row, sets: nextSets } : row))
    actions.patchSession({ exercises })
    if (currentRow.restSec) {
      setRestTotal(currentRow.restSec)
      setRestLeft(currentRow.restSec)
    }
    const finishedExercise = nextSets.every((set) => set.done)
    if (finishedExercise) {
      if (exerciseIndex < active.exercises.length - 1) {
        toast.success(`${exercise?.name} complete`, 'Moving to the next exercise.')
        goTo(exerciseIndex + 1)
      } else {
        toast.success('Final exercise complete', 'Finish the workout to save your session.')
      }
    }
  }, [active, currentRow, currentSetIndex, actions, exerciseIndex, exercise?.name, goTo, toast])

  const undoSet = () => {
    if (!active || !currentRow) return
    const lastDone = [...currentRow.sets].reverse().findIndex((set) => set.done)
    if (lastDone === -1) return
    const index = currentRow.sets.length - 1 - lastDone
    const nextSets = currentRow.sets.map((set, i) => (i === index ? { ...set, done: false } : set))
    actions.patchSession({ exercises: active.exercises.map((row, i) => (i === exerciseIndex ? { ...row, sets: nextSets } : row)) })
  }

  const finish = async () => {
    const ok = await confirm({
      title: 'Finish this workout?',
      description: 'Your sets, calories and streak will be saved to your history.',
      confirmLabel: 'Finish & save',
    })
    if (!ok) return
    const session = actions.finishSession()
    if (!session) return
    setSummary({
      id: session.id,
      title: session.title,
      durationSec: session.durationSec,
      caloriesBurned: session.caloriesBurned,
      completedSets: session.completedSets,
      totalSets: session.totalSets,
      completion: session.completion,
    })
  }

  const exit = async () => {
    const ok = await confirm({
      title: 'Discard this workout?',
      description: 'Progress from this session will not be saved.',
      confirmLabel: 'Discard workout',
      tone: 'danger',
    })
    if (!ok) return
    actions.cancelSession()
    navigate('/workouts')
  }

  /* keyboard shortcuts */
  useEffect(() => {
    if (!active || summary) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.code === 'Space') {
        event.preventDefault()
        actions.patchSession({ paused: !paused })
      }
      if (event.key === 'ArrowRight') goTo(exerciseIndex + 1)
      if (event.key === 'ArrowLeft') goTo(exerciseIndex - 1)
      if (event.key === 'Enter') completeSet()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, summary, paused, actions, goTo, exerciseIndex, completeSet])

  const completionOverlay = (
    <AnimatePresence>
      {summary ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-200 grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="card w-full max-w-lg overflow-hidden"
          >
            <div className="bg-gradient-to-br from-emerald-500/25 to-transparent px-6 py-7 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-emerald-500 text-emerald-950">
                <Trophy size={26} aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-2xl font-extrabold">Workout complete! 🎉</h2>
              <p className="mt-1 text-sm text-muted">
                {summary.title} · {summary.completion}% of sets logged
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 px-6 py-5">
              {[
                { label: 'Duration', value: formatTime(summary.durationSec) },
                { label: 'Calories', value: `${summary.caloriesBurned} kcal` },
                { label: 'Sets', value: `${summary.completedSets}/${summary.totalSets}` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-surface2/70 p-3 text-center">
                  <p className="font-display text-lg font-extrabold tabular-nums">{item.value}</p>
                  <p className="text-[11px] font-semibold text-muted">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5">
              <p className="text-xs font-bold tracking-wide text-muted uppercase">How did it feel?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FEELINGS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFeeling(option.value)
                      actions.rateSession(summary.id, option.value)
                    }}
                    aria-pressed={feeling === option.value}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      feeling === option.value
                        ? 'border-emerald-500 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        : 'border-line text-muted hover:text-ink',
                    )}
                  >
                    <span aria-hidden>{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-line px-6 py-5 sm:flex-row">
              <Button variant="secondary" full onClick={() => navigate('/history')}>
                View in history
              </Button>
              <Button full onClick={() => navigate('/dashboard')} icon={<Check size={16} />}>
                Back to dashboard
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (!active || !currentRow || !exercise) {
    return (
      <div className="grid min-h-dvh place-items-center bg-page px-4">
        {summary ? (
          completionOverlay
        ) : (
          <Card className="max-w-md p-6 text-center">
            <h1 className="font-display text-xl font-bold">No active workout</h1>
            <p className="mt-2 text-sm text-muted">Pick a session from the library and the guided player will take over from here.</p>
            <Button className="mt-4" onClick={() => navigate('/workouts')} icon={<Play size={16} />}>
              Browse workouts
            </Button>
          </Card>
        )}
      </div>
    )
  }

  const workout = getWorkout(active.workoutId)
  const nextRow = active.exercises[exerciseIndex + 1]
  const nextExercise = nextRow ? getExercise(nextRow.exerciseId) : null
  const currentReps = currentRow.sets[currentSetIndex === -1 ? currentRow.sets.length - 1 : currentSetIndex]

  return (
    <div className="min-h-dvh bg-page pb-8">
      {summary ? <Confetti /> : null}

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={exit} aria-label="Exit workout">
            <X size={20} />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{active.title}</p>
            <p className="text-[11px] text-muted">
              Exercise {exerciseIndex + 1} of {active.exercises.length} · {progress.done}/{progress.total} sets
            </p>
          </div>
          <Badge tone="neutral" icon={<Timer size={13} />} className="tabular-nums">
            {formatTime(elapsed)}
          </Badge>
        </div>
        <div className="h-1.5 w-full overflow-hidden bg-surface3">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: `${progress.ratio}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 26 }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        {/* exercise stage */}
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">{exercise.name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                <span className="flex items-center gap-1">
                  <ListChecks size={13} aria-hidden />
                  Set {Math.max(1, currentSetIndex === -1 ? currentRow.sets.length : currentSetIndex + 1)} of {currentRow.sets.length}
                </span>
                <span>
                  {currentRow.sets.filter((set) => set.done).length} sets logged · target {currentRow.sets[0]?.reps}{' '}
                  {currentRow.unit === 'sec' ? 'sec' : 'reps'}
                </span>
              </p>
            </div>
            <Badge tone="brand">{exercise.group}</Badge>
          </div>

          <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-3xl border border-line bg-surface2 sm:aspect-[16/8]">
            <div className="absolute inset-0 p-6 sm:p-10">
              <ExerciseFigure pose={exercise.pose} tone="brand" paused={paused} label={`${exercise.name} demonstration`} />
            </div>

            <AnimatePresence>
              {restLeft !== null ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center bg-page/85 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <ProgressRing
                      value={(restLeft / restTotal) * 100}
                      size={132}
                      stroke={10}
                      tone="water"
                      animate={false}
                      label="Rest countdown"
                    >
                      <div>
                        <p className="font-display text-2xl font-extrabold tabular-nums">{formatTime(restLeft)}</p>
                        <p className="text-[11px] font-semibold text-muted">Rest</p>
                      </div>
                    </ProgressRing>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setRestLeft(null)} icon={<Play size={14} />}>
                        Skip rest
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRestLeft(restLeft + 15)}>
                        +15s
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {paused && restLeft === null ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center bg-page/80 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <p className="font-display text-xl font-extrabold">Workout paused</p>
                    <p className="mt-1 text-xs text-muted">Take your time — your timer is on hold.</p>
                    <Button className="mt-3" onClick={() => actions.patchSession({ paused: false })} icon={<Play size={16} />}>
                      Resume
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* rep counter + sets */}
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-display text-4xl font-extrabold tabular-nums">
                {currentReps?.reps ?? 0}
                <span className="ml-2 text-base font-semibold text-muted">
                  / {currentRow.sets[0]?.reps ?? 0} {currentRow.unit === 'sec' ? 'sec hold' : 'reps'}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentRow.sets.map((set, index) => {
                  const isCurrent = index === currentSetIndex
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => (set.done ? undoSet() : completeSet())}
                      aria-label={`Set ${index + 1} ${set.done ? 'completed' : 'pending'}`}
                      className={cn(
                        'grid size-10 place-items-center rounded-2xl border text-sm font-bold transition-all duration-200',
                        set.done
                          ? 'border-transparent bg-emerald-500 text-emerald-950'
                          : isCurrent
                            ? 'border-emerald-500 text-ink ring-2 ring-emerald-500/25'
                            : 'border-line bg-surface2 text-muted hover:text-ink',
                      )}
                    >
                      {set.done ? <Check size={16} aria-hidden /> : index + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:w-56">
              <Button size="lg" onClick={completeSet} disabled={allSetsDone} icon={<Check size={18} />} full>
                {allSetsDone ? 'Sets complete' : 'Complete set'}
              </Button>
              <Button variant="secondary" onClick={undoSet} icon={<RotateCcw size={16} />} full>
                Undo last set
              </Button>
            </div>
          </div>
        </Card>

        {/* controls */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Button variant="secondary" size="lg" onClick={() => goTo(exerciseIndex - 1)} disabled={exerciseIndex === 0} icon={<ChevronLeft size={18} />}>
            Previous
          </Button>
          <Button
            variant={paused ? 'primary' : 'secondary'}
            size="lg"
            onClick={() => actions.patchSession({ paused: !paused })}
            icon={paused ? <Play size={18} /> : <Pause size={18} />}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => goTo(exerciseIndex + 1)}
            disabled={exerciseIndex >= active.exercises.length - 1}
            icon={<ChevronRight size={18} />}
          >
            Next
          </Button>
          <Button variant="success" size="lg" onClick={finish} icon={<Trophy size={18} />}>
            Finish
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {nextExercise ? (
            <Card className="p-4">
              <p className="text-[11px] font-bold tracking-wide text-muted uppercase">Next up</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="size-14 shrink-0">
                  <ExerciseFigure pose={nextExercise.pose} tone="violet" paused label={`${nextExercise.name} demonstration`} />
                </div>
                <div>
                  <p className="text-sm font-bold">{nextExercise.name}</p>
                  <p className="text-xs text-muted">
                    {nextRow?.sets.length} sets × {nextRow?.sets[0]?.reps} {nextRow?.unit === 'sec' ? 'sec' : 'reps'}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center gap-3 p-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <Trophy size={20} aria-hidden />
              </span>
              <p className="text-sm font-semibold">Last exercise — finish strong and save your session.</p>
            </Card>
          )}

          <Card className="p-4">
            <p className="text-[11px] font-bold tracking-wide text-muted uppercase">Coach tip</p>
            <p className="mt-1.5 text-sm text-ink2">{exercise.tip}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <Flame size={13} className="text-orange-500" aria-hidden />
              ≈{round((active.caloriesPerMin * elapsed) / 60, 0)} kcal burned this session
            </p>
          </Card>
        </div>

        <p className={cn('pb-2 text-center text-xs text-muted', !isDesktop && 'hidden')}>
          Shortcuts: <kbd className="rounded bg-surface2 px-1.5 py-0.5 font-sans">Space</kbd> pause ·{' '}
          <kbd className="rounded bg-surface2 px-1.5 py-0.5 font-sans">←</kbd> previous ·{' '}
          <kbd className="rounded bg-surface2 px-1.5 py-0.5 font-sans">→</kbd> next ·{' '}
          <kbd className="rounded bg-surface2 px-1.5 py-0.5 font-sans">Enter</kbd> complete set
        </p>

        {workout ? (
          <Button variant="ghost" full onClick={() => navigate(`/workouts/${workout.id}`)}>
            View workout details
          </Button>
        ) : null}
      </main>

      {completionOverlay}
    </div>
  )
}
