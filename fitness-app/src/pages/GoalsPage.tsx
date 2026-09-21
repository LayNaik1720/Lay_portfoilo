import { useMemo, useState } from 'react'
import {
  Calendar,
  Check,
  Flame,
  Footprints,
  Droplets,
  Dumbbell,
  Minus,
  Pencil,
  Plus,
  Scale,
  Target,
  Trash,
  Trophy,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { SkeletonList } from '../components/ui/Skeleton'
import { Confetti } from '../components/ui/Confetti'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/Confirm'
import type { Goal, GoalMetric } from '../lib/types'
import { cn, dateKey, formatMl, formatSteps, round, todayKey, uid } from '../lib/utils'

const METRIC_META: Record<GoalMetric, { label: string; icon: typeof Target; unit: string; tone: 'brand' | 'water' | 'calorie' | 'violet' | 'amber' }> = {
  weight: { label: 'Body weight', icon: Scale, unit: 'kg', tone: 'amber' },
  workouts: { label: 'Workouts per week', icon: Dumbbell, unit: 'sessions', tone: 'brand' },
  steps: { label: 'Daily steps', icon: Footprints, unit: 'steps', tone: 'brand' },
  water: { label: 'Daily water', icon: Droplets, unit: 'ml', tone: 'water' },
  calories: { label: 'Daily calories', icon: Flame, unit: 'kcal', tone: 'calorie' },
  custom: { label: 'Custom habit', icon: Target, unit: 'reps', tone: 'violet' },
}

const TEMPLATES: { title: string; metric: GoalMetric; target: number; direction: Goal['direction']; days: number; unit: string }[] = [
  { title: 'Lose 5 kg', metric: 'weight', target: 5, direction: 'decrease', days: 90, unit: 'kg' },
  { title: 'Workout 5 days a week', metric: 'workouts', target: 5, direction: 'increase', days: 7, unit: 'sessions' },
  { title: 'Walk 10,000 steps daily', metric: 'steps', target: 10000, direction: 'increase', days: 30, unit: 'steps' },
  { title: 'Drink 3L water daily', metric: 'water', target: 3000, direction: 'increase', days: 30, unit: 'ml' },
]

const emptyDraft = (weightKg: number) => ({
  title: '',
  metric: 'weight' as GoalMetric,
  target: String(round(Math.max(40, weightKg - 5), 1)),
  direction: 'decrease' as Goal['direction'],
  deadline: dateKey(new Date(Date.now() + 86400000 * 90)),
  perWeek: '',
})

export default function GoalsPage() {
  const { actions } = useApp()
  const fitness = useFitness()
  const toast = useToast()
  const { confirm } = useConfirm()
  const loading = useMountLoading(240)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [draft, setDraft] = useState(emptyDraft(fitness.weightKg || 75))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [celebrate, setCelebrate] = useState(false)

  const active = useMemo(() => fitness.goals.filter((goal) => goal.status !== 'completed'), [fitness.goals])
  const completed = useMemo(() => fitness.goals.filter((goal) => goal.status === 'completed'), [fitness.goals])

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft(fitness.weightKg || 75))
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (goal: Goal) => {
    setEditing(goal)
    setDraft({
      title: goal.title,
      metric: goal.metric,
      target: String(goal.target),
      direction: goal.direction,
      deadline: goal.deadline,
      perWeek: goal.perWeek ? String(goal.perWeek) : '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    const start = template.metric === 'weight' ? fitness.weightKg || 75 : 0
    const target = template.metric === 'weight' ? round(start - template.target, 1) : template.target
    setDraft({
      title: template.title,
      metric: template.metric,
      target: String(target),
      direction: template.direction,
      deadline: dateKey(new Date(Date.now() + 86400000 * template.days)),
      perWeek: template.metric === 'workouts' ? String(template.target) : '',
    })
  }

  const save = () => {
    const next: Record<string, string> = {}
    if (!draft.title.trim()) next.title = 'Give your goal a name.'
    if (!draft.target || Number(draft.target) <= 0) next.target = 'Set a target value.'
    if (!draft.deadline) next.deadline = 'Pick a deadline.'
    else if (draft.deadline < todayKey()) next.deadline = 'Deadline must be in the future.'
    setErrors(next)
    if (Object.keys(next).length) return

    const meta = METRIC_META[draft.metric]
    const start = draft.metric === 'weight' ? fitness.weightKg || 75 : 0
    const current = editing ? editing.current : start

    if (editing) {
      actions.updateGoal(editing.id, {
        title: draft.title.trim(),
        metric: draft.metric,
        target: Number(draft.target),
        direction: draft.direction,
        deadline: draft.deadline,
        perWeek: draft.perWeek ? Number(draft.perWeek) : undefined,
      })
      toast.success('Goal updated', 'Your targets have been saved.')
    } else {
      actions.addGoal({
        id: uid('goal'),
        title: draft.title.trim(),
        metric: draft.metric,
        start,
        current,
        target: Number(draft.target),
        unit: meta.unit,
        direction: draft.direction,
        deadline: draft.deadline,
        createdAt: new Date().toISOString(),
        status: 'active',
        perWeek: draft.perWeek ? Number(draft.perWeek) : undefined,
      })
      toast.success('Goal created', 'Progress tracks automatically when we can detect it.')
    }
    setModalOpen(false)
  }

  const adjust = (goal: Goal, delta: number) => {
    const next = round(Math.max(0, goal.current + delta), 1)
    actions.updateGoal(goal.id, { current: next })
  }

  const completeGoal = async (goal: Goal) => {
    const ok = await confirm({
      title: `Mark “${goal.title}” complete?`,
      description: 'Nice work — this will move the goal to your completed list.',
      confirmLabel: 'Mark complete',
    })
    if (!ok) return
    actions.updateGoal(goal.id, { status: 'completed', current: goal.target })
    setCelebrate(true)
    window.setTimeout(() => setCelebrate(false), 4200)
    toast.success('Goal completed! 🎯', 'A new achievement may have unlocked.')
  }

  const deleteGoal = async (goal: Goal) => {
    const ok = await confirm({
      title: `Delete “${goal.title}”?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete goal',
      tone: 'danger',
    })
    if (ok) {
      actions.deleteGoal(goal.id)
      toast.success('Goal deleted')
    }
  }

  const formatValue = (goal: Goal, value: number) =>
    goal.unit === 'ml' ? formatMl(value) : goal.unit === 'steps' ? formatSteps(value) : `${round(value, 1)}${goal.unit === 'kg' ? ' kg' : ''}`

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonList rows={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {celebrate ? <Confetti count={50} /> : null}

      <PageHeader
        title="Goals"
        subtitle={`${active.length} active · ${completed.length} completed`}
        action={
          <Button onClick={openCreate} icon={<Plus size={16} />}>
            New goal
          </Button>
        }
      />

      {/* templates */}
      <Card className="p-5">
        <SectionHeader title="Start from a template" subtitle="Popular goals our athletes set" icon={<Target size={18} className="text-emerald-600 dark:text-emerald-400" />} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.title}
              type="button"
              onClick={() => {
                applyTemplate(template)
                setEditing(null)
                setModalOpen(true)
              }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface2/50 p-3.5 text-left transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/6"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <Target size={18} aria-hidden />
              </span>
              <span className="text-sm font-semibold">{template.title}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* active goals */}
      <section>
        <SectionHeader title="Active goals" subtitle="Progress updates as you log activity" />
        {active.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((goal) => {
              const meta = METRIC_META[goal.metric]
              const Icon = meta.icon
              const reached = goal.percent >= 100
              return (
                <Card key={goal.id} hover className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cn('grid size-11 place-items-center rounded-2xl', reached ? 'bg-emerald-500 text-emerald-950' : 'bg-surface2 text-ink2')}>
                        <Icon size={19} aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-bold">{goal.title}</p>
                        <p className="text-[11px] font-semibold text-muted">{meta.label}</p>
                      </div>
                    </div>
                    <Badge tone={reached ? 'brand' : goal.daysLeft <= 3 ? 'rose' : 'neutral'}>{goal.daysLeft} days left</Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <ProgressRing value={goal.percent} size={84} stroke={8} tone={meta.tone} label={`${goal.title} progress`}>
                      <span className="text-sm font-extrabold tabular-nums">{goal.percent}%</span>
                    </ProgressRing>
                    <div className="flex-1 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Current</span>
                        <span className="font-bold tabular-nums">{formatValue(goal, goal.current)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Target</span>
                        <span className="font-bold tabular-nums">{formatValue(goal, goal.target)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Remaining</span>
                        <span className="font-bold tabular-nums">{goal.remaining > 0 ? formatValue(goal, goal.remaining) : 'Done'}</span>
                      </div>
                    </div>
                  </div>

                  <ProgressBar className="mt-4" value={goal.percent} tone={meta.tone} label={`${goal.title} progress bar`} />

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                    <Calendar size={13} aria-hidden />
                    Deadline {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {goal.perWeek ? ` · ${goal.perWeek}× per week` : ''}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    {goal.metric === 'custom' ? (
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" size="icon" onClick={() => adjust(goal, -1)} aria-label="Decrease progress">
                          <Minus size={15} />
                        </Button>
                        <Button variant="secondary" size="icon" onClick={() => adjust(goal, 1)} aria-label="Increase progress">
                          <Plus size={15} />
                        </Button>
                      </div>
                    ) : null}
                    <Button size="sm" variant="success" onClick={() => completeGoal(goal)} icon={<Check size={15} />}>
                      Complete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(goal)} icon={<Pencil size={15} />}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteGoal(goal)} aria-label="Delete goal" className="ml-auto">
                      <Trash size={15} />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Target size={22} />}
            title="No active goals"
            description="Goals keep you accountable. Pick a template above or create something custom."
            action={
              <Button onClick={openCreate} icon={<Plus size={16} />}>
                Create your first goal
              </Button>
            }
          />
        )}
      </section>

      {/* completed */}
      {completed.length ? (
        <section>
          <SectionHeader title="Completed" subtitle={`${completed.length} ${completed.length === 1 ? 'goal' : 'goals'} achieved`} icon={<Trophy size={18} className="text-amber-500" />} />
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {completed.map((goal) => (
              <li key={goal.id}>
                <Card className="flex items-center gap-3 border-emerald-500/30 bg-emerald-500/6 p-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 text-emerald-950">
                    <Trophy size={19} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{goal.title}</p>
                    <p className="text-[11px] font-semibold text-muted">
                      Target {formatValue(goal, goal.target)} · reached {goal.daysLeft} days early
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal)} aria-label={`Delete ${goal.title}`}>
                    <Trash size={15} />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* create / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit goal' : 'Create a goal'}
        description="Choose what you want to measure and by when."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} icon={<Check size={16} />}>
              {editing ? 'Save changes' : 'Create goal'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Goal title"
            placeholder="Lose 5 kg"
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            error={errors.title}
            required
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Metric"
              value={draft.metric}
              onChange={(event) => setDraft((prev) => ({ ...prev, metric: event.target.value as GoalMetric }))}
            >
              {(Object.keys(METRIC_META) as GoalMetric[]).map((metric) => (
                <option key={metric} value={metric}>
                  {METRIC_META[metric].label}
                </option>
              ))}
            </Select>
            <Select
              label="Direction"
              value={draft.direction}
              onChange={(event) => setDraft((prev) => ({ ...prev, direction: event.target.value as Goal['direction'] }))}
            >
              <option value="decrease">Decrease to target</option>
              <option value="increase">Increase to target</option>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Target value"
              type="number"
              step="0.1"
              value={draft.target}
              onChange={(event) => setDraft((prev) => ({ ...prev, target: event.target.value }))}
              error={errors.target}
              suffix={METRIC_META[draft.metric].unit}
              required
            />
            <Input
              label="Deadline"
              type="date"
              value={draft.deadline}
              min={todayKey()}
              onChange={(event) => setDraft((prev) => ({ ...prev, deadline: event.target.value }))}
              error={errors.deadline}
              required
            />
          </div>

          {draft.metric === 'workouts' ? (
            <Input
              label="Sessions per week (optional)"
              type="number"
              min={1}
              max={7}
              value={draft.perWeek}
              onChange={(event) => setDraft((prev) => ({ ...prev, perWeek: event.target.value }))}
              hint="Used to show weekly pacing on your dashboard."
            />
          ) : null}

          <p className="rounded-2xl bg-surface2/60 p-3 text-xs text-muted">
            Weight, steps, water, calories and workout goals update automatically from your logged activity.
          </p>
        </div>
      </Modal>
    </div>
  )
}
