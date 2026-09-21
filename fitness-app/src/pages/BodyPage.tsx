import { useMemo, useState } from 'react'
import { Activity, Plus, Ruler, Scale, Trash, TrendingDown, TrendingUp } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Segmented } from '../components/ui/Segmented'
import { SkeletonCard, SkeletonStatRow } from '../components/ui/Skeleton'
import { ChartCard, TrendLine } from '../components/charts/Charts'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/Confirm'
import { BODY_FIELDS } from '../lib/seed'
import { bmiCategory, calcBMI, estimateBodyFat, weightChange } from '../lib/fitness'
import type { BodyEntry } from '../lib/types'
import { formatLength, formatShortDate, formatWeight, lastNDays, round, todayKey, uid } from '../lib/utils'

type Range = '30' | '90' | '365'

export default function BodyPage() {
  const { data, user, actions } = useApp()
  const fitness = useFitness()
  const toast = useToast()
  const { confirm } = useConfirm()
  const loading = useMountLoading()

  const [range, setRange] = useState<Range>('90')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    weightKg: String(fitness.weightKg || 75),
    bodyFat: '',
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
    date: todayKey(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const units = user?.settings.units ?? 'metric'
  const sorted = useMemo(() => [...data.body].sort((a, b) => (a.date < b.date ? 1 : -1)), [data.body])
  const latest = sorted[0]
  const previous = sorted[1]
  const heightCm = user?.profile.heightCm ?? 175

  const days = Number(range) as 30 | 90 | 365
  const cutoff = lastNDays(days)[0]
  const inRange = useMemo(() => [...sorted].filter((entry) => entry.date >= cutoff).reverse(), [sorted, cutoff])

  const weightSeries = inRange.map((entry) => ({ label: formatShortDate(entry.date, { month: 'short', day: 'numeric' }), weight: entry.weightKg }))
  const fatSeries = inRange
    .filter((entry) => typeof entry.bodyFat === 'number')
    .map((entry) => ({ label: formatShortDate(entry.date, { month: 'short', day: 'numeric' }), bodyFat: entry.bodyFat as number }))

  const bmi = latest ? calcBMI(latest.weightKg, heightCm) : calcBMI(user?.profile.weightKg ?? 75, heightCm)
  const category = bmiCategory(bmi)
  const delta = weightChange(data.body, days)
  const measurementDelta = (key: keyof BodyEntry['measurements']) => {
    if (!latest || !previous) return 0
    const now = latest.measurements[key]
    const before = previous.measurements[key]
    if (typeof now !== 'number' || typeof before !== 'number') return 0
    return round(now - before, 1)
  }

  const weightDomain = useMemo<[number | 'auto', number | 'auto']>(() => {
    const values = weightSeries.map((point) => point.weight)
    if (!values.length) return ['auto', 'auto']
    return [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)]
  }, [weightSeries])

  const save = () => {
    const next: Record<string, string> = {}
    const weight = Number(form.weightKg)
    if (!weight || weight < 30 || weight > 300) next.weightKg = 'Enter a realistic weight.'
    if (form.bodyFat && (Number(form.bodyFat) < 2 || Number(form.bodyFat) > 70)) next.bodyFat = 'Body fat should be between 2 and 70%.'
    if (!form.date) next.date = 'Pick a date.'
    setErrors(next)
    if (Object.keys(next).length) return

    const bmiValue = calcBMI(weight, heightCm)
    const entry: BodyEntry = {
      id: uid('body'),
      date: form.date,
      weightKg: round(weight, 1),
      bodyFat: form.bodyFat ? round(Number(form.bodyFat), 1) : estimateBodyFat(bmiValue, user?.profile.age ?? 30, user?.profile.gender ?? 'male'),
      measurements: {
        chest: form.chest ? round(Number(form.chest), 1) : latest?.measurements.chest,
        waist: form.waist ? round(Number(form.waist), 1) : latest?.measurements.waist,
        hips: form.hips ? round(Number(form.hips), 1) : latest?.measurements.hips,
        arms: form.arms ? round(Number(form.arms), 1) : latest?.measurements.arms,
        thighs: form.thighs ? round(Number(form.thighs), 1) : latest?.measurements.thighs,
      },
      at: new Date().toISOString(),
    }
    actions.addBodyEntry(entry)
    actions.updateProfile({ weightKg: entry.weightKg })
    setModalOpen(false)
    toast.success('Measurement saved', `Weight logged at ${formatWeight(entry.weightKg, units)}.`)
  }

  const remove = async (entry: BodyEntry) => {
    const ok = await confirm({
      title: `Delete the entry for ${formatShortDate(entry.date)}?`,
      description: 'Charts and BMI will be recalculated.',
      confirmLabel: 'Delete entry',
      tone: 'danger',
    })
    if (ok) {
      actions.removeBodyEntry(entry.id)
      toast.success('Entry deleted')
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonStatRow count={4} />
        <SkeletonCard className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Body tracker"
        subtitle="Weight, BMI, body fat and tape measurements in one timeline"
        action={
          <>
            <Segmented
              ariaLabel="Date range"
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: '30', label: '30d' },
                { value: '90', label: '3m' },
                { value: '365', label: '1y' },
              ]}
            />
            <Button onClick={() => setModalOpen(true)} icon={<Plus size={16} />}>
              Add measurement
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted">
            <Scale size={16} aria-hidden />
            <p className="text-[11px] font-bold tracking-wide uppercase">Weight</p>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">{formatWeight(latest?.weightKg ?? fitness.weightKg, units)}</p>
          <p className={`text-xs font-semibold ${delta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {delta === 0 ? 'Stable' : `${delta > 0 ? '+' : ''}${delta} kg`} over {days === 365 ? '1 year' : `${days} days`}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted">
            <Activity size={16} aria-hidden />
            <p className="text-[11px] font-bold tracking-wide uppercase">BMI</p>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">{round(bmi, 1)}</p>
          <p className={`text-xs font-semibold ${category.tone}`}>{category.label} range</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted">
            <TrendingDown size={16} aria-hidden />
            <p className="text-[11px] font-bold tracking-wide uppercase">Body fat</p>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">
            {round(latest?.bodyFat ?? estimateBodyFat(bmi, user?.profile.age ?? 30, user?.profile.gender ?? 'male'), 1)}%
          </p>
          <p className="text-xs text-muted">Estimated from BMI &amp; age</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted">
            <Ruler size={16} aria-hidden />
            <p className="text-[11px] font-bold tracking-wide uppercase">Waist</p>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">
            {latest?.measurements.waist ? formatLength(latest.measurements.waist, units) : '—'}
          </p>
          <p className="text-xs text-muted">
            {measurementDelta('waist') === 0 ? 'No change' : `${measurementDelta('waist') > 0 ? '+' : ''}${measurementDelta('waist')} cm since last`}
          </p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Weight trend" subtitle={`${inRange.length} entries in range`} icon={<Scale size={18} className="text-amber-500" />}>
          {weightSeries.length > 1 ? (
            <TrendLine data={weightSeries} dataKey="weight" name="Weight" unit=" kg" tone="violet" yDomain={weightDomain} />
          ) : (
            <EmptyState compact icon={<Scale size={20} />} title="Not enough data" description="Log at least two measurements to see the trend." />
          )}
        </ChartCard>

        <ChartCard title="Body fat trend" subtitle="Percentage over time" icon={<Activity size={18} className="text-rose-500" />}>
          {fatSeries.length > 1 ? (
            <TrendLine data={fatSeries} dataKey="bodyFat" name="Body fat" unit="%" tone="rose" />
          ) : (
            <EmptyState compact icon={<Activity size={20} />} title="No body fat data" description="Add measurements with body fat to unlock this chart." />
          )}
        </ChartCard>
      </div>

      <Card className="p-5">
        <SectionHeader title="Measurements" subtitle="Latest readings with change since the previous entry" icon={<Ruler size={18} className="text-emerald-600 dark:text-emerald-400" />} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BODY_FIELDS.map((field) => {
            const value = latest?.measurements[field.key]
            const change = measurementDelta(field.key)
            return (
              <div key={field.key} className="rounded-2xl border border-line bg-surface2/50 p-4">
                <p className="text-[11px] font-bold tracking-wide text-muted uppercase">{field.label}</p>
                <p className="mt-1.5 font-display text-xl font-extrabold tabular-nums">
                  {value ? formatLength(value, units) : '—'}
                </p>
                {change !== 0 ? (
                  <p className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${change < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {change < 0 ? <TrendingDown size={12} aria-hidden /> : <TrendingUp size={12} aria-hidden />}
                    {change > 0 ? '+' : ''}
                    {change} cm
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted">No change</p>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Measurement history" subtitle={`${sorted.length} total entries`} />
        {sorted.length ? (
          <ul className="space-y-2">
            {sorted.slice(0, 12).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface2/40 px-4 py-3">
                <span className="w-28 text-sm font-bold">{formatShortDate(entry.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="flex-1 text-sm font-semibold tabular-nums">{formatWeight(entry.weightKg, units)}</span>
                {entry.bodyFat ? <Badge tone="rose">{entry.bodyFat}% fat</Badge> : null}
                {entry.measurements.waist ? <Badge tone="brand">waist {formatLength(entry.measurements.waist, units)}</Badge> : null}
                <Button variant="ghost" size="icon" onClick={() => remove(entry)} aria-label={`Delete entry from ${entry.date}`}>
                  <Trash size={15} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Ruler size={22} />}
            title="No measurements yet"
            description="Add your first reading and Pulse will chart the changes for you."
            action={
              <Button onClick={() => setModalOpen(true)} icon={<Plus size={16} />}>
                Add measurement
              </Button>
            }
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add a measurement"
        description="Only weight is required — the rest is optional."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} icon={<Plus size={16} />}>
              Save measurement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Weight"
              type="number"
              step="0.1"
              value={form.weightKg}
              onChange={(event) => setForm((prev) => ({ ...prev, weightKg: event.target.value }))}
              error={errors.weightKg}
              suffix={units === 'imperial' ? 'lb' : 'kg'}
              required
            />
            <Input
              label="Body fat %"
              type="number"
              step="0.1"
              placeholder="Optional"
              value={form.bodyFat}
              onChange={(event) => setForm((prev) => ({ ...prev, bodyFat: event.target.value }))}
              error={errors.bodyFat}
              suffix="%"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              max={todayKey()}
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              error={errors.date}
            />
            <Input
              label="Chest"
              type="number"
              step="0.1"
              placeholder="Optional"
              value={form.chest}
              onChange={(event) => setForm((prev) => ({ ...prev, chest: event.target.value }))}
              suffix="cm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Waist"
              type="number"
              step="0.1"
              placeholder="Optional"
              value={form.waist}
              onChange={(event) => setForm((prev) => ({ ...prev, waist: event.target.value }))}
              suffix="cm"
            />
            <Input
              label="Hips"
              type="number"
              step="0.1"
              placeholder="Optional"
              value={form.hips}
              onChange={(event) => setForm((prev) => ({ ...prev, hips: event.target.value }))}
              suffix="cm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Arms"
              type="number"
              step="0.1"
              placeholder="Optional"
              value={form.arms}
              onChange={(event) => setForm((prev) => ({ ...prev, arms: event.target.value }))}
              suffix="cm"
            />
            <Input
              label="Thighs"
              type="number"
              step="0.1"
              placeholder="Optional"
              value={form.thighs}
              onChange={(event) => setForm((prev) => ({ ...prev, thighs: event.target.value }))}
              suffix="cm"
            />
          </div>

          <p className="rounded-2xl bg-surface2/60 p-3 text-xs text-muted">
            Measure at the same time of day (morning works best) for the most reliable trend.
          </p>
        </div>
      </Modal>
    </div>
  )
}
