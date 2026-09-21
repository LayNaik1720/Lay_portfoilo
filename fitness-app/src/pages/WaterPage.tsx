import { useMemo, useState } from 'react'
import { Check, Droplets, GlassWater, Minus, Plus, Settings2, Trash, Undo2 } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ProgressRing } from '../components/ui/Progress'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'
import { ChartCard, SeriesBars } from '../components/charts/Charts'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/Confirm'
import { cn, formatMl, lastNDays, percent, round, todayKey, weekKeys, weekdayShort } from '../lib/utils'

const QUICK_ADDS = [250, 500, 750]
const GOAL_PRESETS = [2000, 2500, 3000, 3500, 4000]

export default function WaterPage() {
  const { data, user, actions } = useApp()
  const fitness = useFitness()
  const toast = useToast()
  const { confirm } = useConfirm()
  const loading = useMountLoading(240)

  const [customOpen, setCustomOpen] = useState(false)
  const [customMl, setCustomMl] = useState('400')
  const [goalOpen, setGoalOpen] = useState(false)
  const [goalDraft, setGoalDraft] = useState(fitness.targets.waterGoalMl)

  const goal = fitness.targets.waterGoalMl
  const today = todayKey()
  const todayLogs = useMemo(
    () => [...data.water].filter((log) => log.date === today).sort((a, b) => (a.at < b.at ? 1 : -1)),
    [data.water, today],
  )
  const total = todayLogs.reduce((acc, log) => acc + log.ml, 0)
  const glassCount = Math.round(total / 250)

  const weekKeysList = weekKeys()
  const weekChart = weekKeysList.map((key) => ({
    label: weekdayShort(key),
    litres: round(data.water.filter((log) => log.date === key).reduce((acc, log) => acc + log.ml, 0) / 1000, 2),
  }))

  const last30 = lastNDays(30)
  const stats = useMemo(() => {
    const daily = last30.map((key) => data.water.filter((log) => log.date === key).reduce((acc, log) => acc + log.ml, 0))
    const daysHitGoal = daily.filter((value) => value >= goal).length
    const average = daily.length ? Math.round(daily.reduce((acc, value) => acc + value, 0) / daily.length) : 0
    const best = Math.max(0, ...daily)
    return { daysHitGoal, average, best }
  }, [data.water, goal, last30])

  const addWater = (ml: number) => {
    actions.logWater(ml)
    const next = total + ml
    if (next >= goal && total < goal) {
      toast.success('Hydration goal complete! 💧', `${formatMl(next)} logged — outstanding work.`)
    } else {
      toast.success(`+${ml}ml`, `${formatMl(next)} of ${formatMl(goal)} today.`)
    }
  }

  const undoLast = () => {
    const last = todayLogs[0]
    if (!last) return
    actions.removeWater(last.id)
    toast.info('Last entry removed', `${formatMl(Math.max(0, total - last.ml))} logged today.`)
  }

  const removeLog = async (id: string, ml: number) => {
    const ok = await confirm({
      title: `Remove ${formatMl(ml)}?`,
      description: 'This entry will be deleted from today’s hydration log.',
      confirmLabel: 'Remove',
      tone: 'danger',
    })
    if (ok) actions.removeWater(id)
  }

  const saveGoal = () => {
    const value = Math.max(500, Math.min(6000, Math.round(goalDraft / 50) * 50))
    actions.setWaterGoal(value)
    setGoalOpen(false)
    toast.success('Water goal updated', `Your new daily target is ${formatMl(value)}.`)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-56" />
      </div>
    )
  }

  const pct = percent(total, goal)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Water tracker"
        subtitle={`${glassCount} ${glassCount === 1 ? 'glass' : 'glasses'} today · goal ${formatMl(goal)}`}
        action={
          <>
            <Button variant="outline" onClick={() => setGoalOpen(true)} icon={<Settings2 size={16} />}>
              Edit goal
            </Button>
            <Button onClick={() => addWater(500)} icon={<Plus size={16} />}>
              Add water
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Card className="flex flex-col items-center gap-6 p-6">
          <ProgressRing value={pct} size={196} stroke={16} tone="water" label="Hydration progress">
            <div>
              <p className="font-display text-3xl font-extrabold tabular-nums">{(total / 1000).toFixed(1)}L</p>
              <p className="text-xs font-semibold text-muted">of {(goal / 1000).toFixed(1)}L</p>
              <p className="mt-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">{Math.round(pct)}% hydrated</p>
            </div>
          </ProgressRing>

          <div className="w-full">
            <p className="mb-2 text-center text-xs font-bold tracking-wide text-muted uppercase">Quick add</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ADDS.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => addWater(ml)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface2/60 py-3.5 text-sm font-bold transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/10 active:scale-95"
                >
                  <Plus size={16} className="text-sky-500" aria-hidden />
                  {ml}ml
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setCustomOpen(true)} icon={<GlassWater size={16} />}>
                Custom amount
              </Button>
              <Button variant="ghost" onClick={undoLast} disabled={!todayLogs.length} icon={<Undo2 size={16} />}>
                Undo last
              </Button>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 text-center">
            {[
              { label: 'Today', value: formatMl(total) },
              { label: 'Remaining', value: formatMl(Math.max(0, goal - total)) },
              { label: 'Glasses', value: `${glassCount}` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-surface2/50 p-3">
                <p className="font-display text-lg font-extrabold tabular-nums">{item.value}</p>
                <p className="text-[11px] font-semibold text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <ChartCard title="This week" subtitle={`${(weekChart.reduce((acc, day) => acc + day.litres, 0)).toFixed(1)}L across 7 days`} icon={<Droplets size={18} className="text-water" />} height={220}>
            <SeriesBars data={weekChart} dataKey="litres" name="Litres" unit="L" tone="water" targetValue={goal / 1000} />
          </ChartCard>

          <Card className="p-5">
            <SectionHeader title="Hydration insights" subtitle="Based on the last 30 days" icon={<Droplets size={18} className="text-water" />} />
            <dl className="grid grid-cols-3 gap-3">
              {[
                { label: 'Daily average', value: formatMl(stats.average) },
                { label: 'Days goal hit', value: `${stats.daysHitGoal}/30` },
                { label: 'Best day', value: formatMl(stats.best) },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-line bg-surface2/50 p-3 text-center">
                  <dt className="text-[11px] font-semibold text-muted">{item.label}</dt>
                  <dd className="mt-1 text-sm font-bold tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sky-500/8 p-3 text-xs font-medium text-sky-700 dark:text-sky-300">
              <Check size={14} className="mt-0.5 shrink-0" aria-hidden />
              {stats.daysHitGoal >= 20
                ? 'Excellent consistency — you are hitting your hydration target most days.'
                : `You hit your goal on ${stats.daysHitGoal} of the last 30 days. Aim for one extra glass before lunch.`}
            </p>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionHeader title="Today’s log" subtitle={`${todayLogs.length} ${todayLogs.length === 1 ? 'entry' : 'entries'}`} />
        {todayLogs.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {todayLogs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface2/40 px-3.5 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
                  <Droplets size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold tabular-nums">{formatMl(log.ml)}</p>
                  <p className="text-[11px] text-muted">
                    {new Date(log.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeLog(log.id, log.ml)} aria-label={`Remove ${formatMl(log.ml)} entry`}>
                  <Trash size={15} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<GlassWater size={22} />}
            title="No water logged today"
            description="Hydration drives recovery and focus. Log your first glass to start the count."
            action={
              <Button onClick={() => addWater(500)} icon={<Plus size={16} />}>
                Add 500ml
              </Button>
            }
          />
        )}
      </Card>

      {/* custom amount */}
      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add a custom amount"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const ml = Math.max(50, Math.min(2000, Number(customMl) || 0))
                setCustomOpen(false)
                addWater(ml)
              }}
            >
              Add water
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Amount"
            type="number"
            min={50}
            max={2000}
            step={50}
            suffix="ml"
            value={customMl}
            onChange={(event) => setCustomMl(event.target.value)}
            hint="Bottle sizes are usually 330ml, 500ml or 750ml."
          />
          <div className="flex flex-wrap gap-2">
            {[150, 330, 500, 750, 1000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setCustomMl(String(amount))}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  Number(customMl) === amount ? 'border-sky-500 bg-sky-500/12 text-sky-700 dark:text-sky-300' : 'border-line text-muted hover:text-ink',
                )}
              >
                {amount}ml
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* goal editor */}
      <Modal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="Daily water goal"
        description="We suggest 35ml per kilogram of body weight."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGoalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveGoal}>Save goal</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Daily target"
            type="number"
            min={500}
            max={6000}
            step={50}
            suffix="ml"
            value={goalDraft}
            onChange={(event) => setGoalDraft(Number(event.target.value))}
            hint={`Recommended for ${fitness.weightKg || 75}kg: ${Math.round(((fitness.weightKg || 75) * 35) / 250) * 250}ml`}
          />
          <div className="flex flex-wrap gap-2">
            {GOAL_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setGoalDraft(preset)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  goalDraft === preset ? 'border-sky-500 bg-sky-500/12 text-sky-700 dark:text-sky-300' : 'border-line text-muted hover:text-ink',
                )}
              >
                {(preset / 1000).toFixed(1)}L
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-surface2/60 p-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setGoalDraft((prev) => Math.max(500, prev - 250))}
              aria-label="Decrease goal"
            >
              <Minus size={16} />
            </Button>
            <span className="flex-1 text-center text-sm font-bold tabular-nums">{formatMl(goalDraft)}</span>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setGoalDraft((prev) => Math.min(6000, prev + 250))}
              aria-label="Increase goal"
            >
              <Plus size={16} />
            </Button>
          </div>
          {user ? <p className="text-xs text-muted">Applies immediately and updates your dashboard goal ring.</p> : null}
        </div>
      </Modal>
    </div>
  )
}
