import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, Info, Plus, Trash, UtensilsCrossed, Wheat, Beef, Droplet } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { SkeletonCard, SkeletonStatRow } from '../components/ui/Skeleton'
import { MacroDonut } from '../components/charts/Charts'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/Confirm'
import { FOOD_LIBRARY, macroTargets } from '../lib/nutrition'
import type { Meal, MealType } from '../lib/types'
import { MEAL_LABELS } from '../lib/seed'
import { MEAL_TONE, TONES } from '../components/ui/tokens'
import { cn, dateKey, formatMl, percent, round, todayKey, uid } from '../lib/utils'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const emptyForm = (type: MealType) => ({
  type,
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
})

export default function NutritionPage() {
  const { data, user, actions } = useApp()
  const fitness = useFitness()
  const toast = useToast()
  const { confirm } = useConfirm()
  const loading = useMountLoading()

  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm('breakfast'))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const targets = fitness.targets
  const macroGoals = macroTargets(targets.caloriesGoal, fitness.weightKg || 75)

  const dayMeals = useMemo(() => data.meals.filter((meal) => meal.date === selectedDate), [data.meals, selectedDate])
  const burned = useMemo(
    () => round(data.sessions.filter((session) => session.date === selectedDate).reduce((acc, session) => acc + session.caloriesBurned, 0), 0),
    [data.sessions, selectedDate],
  )
  const consumed = round(dayMeals.reduce((acc, meal) => acc + meal.calories, 0), 0)
  const macros = useMemo(
    () => ({
      protein: round(dayMeals.reduce((acc, meal) => acc + meal.protein, 0), 0),
      carbs: round(dayMeals.reduce((acc, meal) => acc + meal.carbs, 0), 0),
      fat: round(dayMeals.reduce((acc, meal) => acc + meal.fat, 0), 0),
    }),
    [dayMeals],
  )
  const remaining = Math.max(0, targets.caloriesGoal - consumed + burned)
  const isToday = selectedDate === todayKey()
  const dateLabel = isToday
    ? 'Today'
    : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const shiftDate = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    if (dateKey(next) > todayKey()) return
    setSelectedDate(dateKey(next))
  }

  const openAdd = (type: MealType) => {
    setForm(emptyForm(type))
    setErrors({})
    setModalOpen(true)
  }

  const saveMeal = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Give this meal a name.'
    if (!form.calories || Number(form.calories) <= 0) next.calories = 'Calories are required.'
    setErrors(next)
    if (Object.keys(next).length) return

    const meal: Meal = {
      id: uid('meal'),
      date: selectedDate,
      type: form.type,
      name: form.name.trim(),
      calories: Number(form.calories),
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      at: new Date().toISOString(),
    }
    actions.addMeal(meal)
    setModalOpen(false)
    toast.success('Meal logged', `${meal.name} added to ${MEAL_LABELS[meal.type].toLowerCase()}.`)
  }

  const removeMeal = async (meal: Meal) => {
    const ok = await confirm({
      title: `Remove ${meal.name}?`,
      description: 'This entry will be deleted from your nutrition log.',
      confirmLabel: 'Remove',
      tone: 'danger',
    })
    if (ok) {
      actions.removeMeal(meal.id)
      toast.success('Meal removed', 'Your daily totals have been updated.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonStatRow count={3} />
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nutrition"
        subtitle="Track what you eat and how it fuels your training"
        action={
          <>
            <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
              <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)} aria-label="Previous day">
                <ChevronLeft size={18} />
              </Button>
              <span className="min-w-24 text-center text-sm font-bold">{dateLabel}</span>
              <Button variant="ghost" size="icon" onClick={() => shiftDate(1)} disabled={isToday} aria-label="Next day">
                <ChevronRight size={18} />
              </Button>
            </div>
            <Button onClick={() => openAdd('breakfast')} icon={<Plus size={16} />}>
              Add meal
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <Card className="flex flex-col items-center gap-5 p-5">
          <ProgressRing value={percent(consumed, targets.caloriesGoal)} size={176} stroke={14} tone="calorie" label="Calories consumed">
            <div>
              <p className="font-display text-3xl font-extrabold tabular-nums">{consumed}</p>
              <p className="text-xs font-semibold text-muted">of {targets.caloriesGoal} kcal</p>
            </div>
          </ProgressRing>

          <dl className="grid w-full grid-cols-3 gap-2 text-center">
            {[
              { label: 'Consumed', value: consumed, tone: 'calorie' as const },
              { label: 'Burned', value: burned, tone: 'brand' as const },
              { label: 'Remaining', value: remaining, tone: 'water' as const },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-surface2/50 p-3">
                <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">{item.label}</dt>
                <dd className={cn('mt-1 font-display text-lg font-extrabold tabular-nums', TONES[item.tone].text)}>{item.value}</dd>
              </div>
            ))}
          </dl>

          <p className="flex items-start gap-2 rounded-2xl bg-surface2/60 p-3 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            Goal set from your {user?.profile.goal.replace('-', ' ')} plan. Adjust it in Profile → Fitness goals.
          </p>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionHeader title="Daily nutrition summary" subtitle="Macros against your personalised targets" icon={<Beef size={18} className="text-orange-500" />} />
            <div className="grid gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
              <div className="h-52">
                <MacroDonut
                  data={[
                    { name: 'Protein', value: macros.protein, tone: 'brand' },
                    { name: 'Carbs', value: macros.carbs, tone: 'amber' },
                    { name: 'Fat', value: macros.fat, tone: 'violet' },
                  ]}
                />
              </div>
              <ul className="space-y-4">
                {[
                  { label: 'Protein', value: macros.protein, goal: macroGoals.protein, tone: 'brand' as const, unit: 'g' },
                  { label: 'Carbs', value: macros.carbs, goal: macroGoals.carbs, tone: 'amber' as const, unit: 'g' },
                  { label: 'Fat', value: macros.fat, goal: macroGoals.fat, tone: 'violet' as const, unit: 'g' },
                ].map((macro) => (
                  <li key={macro.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                      <span className="text-ink2">{macro.label}</span>
                      <span className="text-muted tabular-nums">
                        {macro.value} / {macro.goal}
                        {macro.unit}
                      </span>
                    </div>
                    <ProgressBar value={percent(macro.value, macro.goal)} tone={macro.tone} size="sm" label={`${macro.label} progress`} />
                  </li>
                ))}
                <li className="flex items-center justify-between rounded-2xl bg-surface2/60 px-3 py-2 text-xs font-semibold text-muted">
                  <span className="flex items-center gap-1.5">
                    <Droplet size={13} className="text-sky-500" aria-hidden />
                    Hydration today
                  </span>
                  <span className="tabular-nums">
                    {formatMl(fitness.today.waterMl)} / {formatMl(targets.waterGoalMl)}
                  </span>
                </li>
              </ul>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Meals" subtitle={`${dayMeals.length} ${dayMeals.length === 1 ? 'entry' : 'entries'} logged`} icon={<UtensilsCrossed size={18} className="text-emerald-600 dark:text-emerald-400" />} />
            <div className="space-y-4">
              {MEAL_ORDER.map((type) => {
                const meals = dayMeals.filter((meal) => meal.type === type)
                const total = round(meals.reduce((acc, meal) => acc + meal.calories, 0), 0)
                return (
                  <section key={type} className="rounded-3xl border border-line bg-surface2/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={MEAL_TONE[type]}>{MEAL_LABELS[type]}</Badge>
                        <span className="text-sm font-bold tabular-nums">{total} kcal</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openAdd(type)} icon={<Plus size={15} />}>
                        Add
                      </Button>
                    </div>

                    {meals.length ? (
                      <ul className="mt-3 space-y-2">
                        {meals.map((meal) => (
                          <li key={meal.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">{meal.name}</p>
                              <p className="mt-0.5 text-[11px] font-medium text-muted tabular-nums">
                                {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                              </p>
                            </div>
                            <span className="text-[11px] font-semibold text-muted tabular-nums">
                              {new Date(meal.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => removeMeal(meal)} aria-label={`Remove ${meal.name}`}>
                              <Trash size={15} />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 rounded-2xl border border-dashed border-line px-3.5 py-4 text-center text-xs text-muted">
                        {isToday ? `No ${MEAL_LABELS[type].toLowerCase()} logged yet.` : `Nothing logged for ${MEAL_LABELS[type].toLowerCase()}.`}
                      </p>
                    )}
                  </section>
                )
              })}
            </div>

            {!dayMeals.length ? (
              <EmptyState
                icon={<UtensilsCrossed size={22} />}
                title="No meals added yet."
                description="Log your first meal to see calories, protein, carbs and fat add up in real time."
                action={
                  <Button onClick={() => openAdd('breakfast')} icon={<Plus size={16} />}>
                    Add Meal
                  </Button>
                }
                className="mt-4"
              />
            ) : null}
          </Card>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log a meal"
        description="Pick a quick-add item or type your own numbers."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMeal} icon={<Plus size={16} />}>
              Add meal
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Meal"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as MealType }))}
            >
              {MEAL_ORDER.map((type) => (
                <option key={type} value={type}>
                  {MEAL_LABELS[type]}
                </option>
              ))}
            </Select>
            <Input
              label="Calories"
              type="number"
              min={1}
              placeholder="450"
              value={form.calories}
              onChange={(event) => setForm((prev) => ({ ...prev, calories: event.target.value }))}
              error={errors.calories}
              suffix="kcal"
              required
            />
          </div>

          <Input
            label="Food name"
            placeholder="Grilled chicken & rice"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            error={errors.name}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            {(['protein', 'carbs', 'fat'] as const).map((macro) => (
              <Input
                key={macro}
                label={macro[0].toUpperCase() + macro.slice(1)}
                type="number"
                min={0}
                placeholder="0"
                value={form[macro]}
                onChange={(event) => setForm((prev) => ({ ...prev, [macro]: event.target.value }))}
                suffix="g"
              />
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {FOOD_LIBRARY.map((food) => (
                <button
                  key={food.name}
                  type="button"
                  onClick={() =>
                    setForm({
                      type: food.type,
                      name: food.name,
                      calories: String(food.calories),
                      protein: String(food.protein),
                      carbs: String(food.carbs),
                      fat: String(food.fat),
                    })
                  }
                  className="rounded-full border border-line bg-surface2/60 px-3 py-1.5 text-xs font-semibold text-ink2 transition-colors hover:border-emerald-500/50 hover:text-ink"
                >
                  {food.name} · {food.calories}
                </button>
              ))}
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-2xl bg-surface2/60 p-3 text-xs text-muted">
            <Wheat size={14} className="mt-0.5 shrink-0" aria-hidden />
            Tip: logging protein first makes hitting your daily target much easier.
          </p>
        </div>
      </Modal>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-orange-500/12 text-orange-500">
            <Flame size={20} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold">Calorie balance</p>
            <p className="text-xs text-muted">
              {consumed} consumed − {burned} burned = {consumed - burned} net vs {targets.caloriesGoal} goal
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => shiftDate(-1)} icon={<ChevronLeft size={16} />}>
          Review yesterday
        </Button>
      </Card>
    </div>
  )
}
