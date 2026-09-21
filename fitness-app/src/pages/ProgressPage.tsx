import { useMemo, useState } from 'react'
import {
  Activity,
  Award,
  ChartLine,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  Percent,
  RefreshCw,
  Ruler,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Button, LinkButton } from '../components/ui/Button'
import { Segmented } from '../components/ui/Segmented'
import { SkeletonCard, SkeletonStatRow } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ChartCard, SeriesBars, TrendArea, TrendLine } from '../components/charts/Charts'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { useToast } from '../components/ui/Toast'
import { buildDaySummaries, weightChange } from '../lib/fitness'
import { formatShortDate, formatSteps, lastNDays, round, sum, weekdayShort } from '../lib/utils'

type Range = '7' | '30' | '90' | '365'

const RANGE_LABELS: Record<Range, string> = { '7': '7 days', '30': '30 days', '90': '3 months', '365': '1 year' }

export default function ProgressPage() {
  const { data, user, actions } = useApp()
  const fitness = useFitness()
  const toast = useToast()
  const loading = useMountLoading()
  const [range, setRange] = useState<Range>('30')

  const days = Number(range) as 7 | 30 | 90 | 365
  const bucketSize = days <= 30 ? 1 : days <= 90 ? 7 : 30

  const { summaries, buckets } = useMemo(() => {
    const keys = lastNDays(days)
    const daily = buildDaySummaries(data.sessions, data.meals, data.water, data.steps, keys)
    const grouped = []
    for (let i = 0; i < daily.length; i += bucketSize) {
      const slice = daily.slice(i, i + bucketSize)
      grouped.push({
        label:
          bucketSize === 1
            ? formatShortDate(slice[0].key, { month: 'short', day: 'numeric' })
            : `${formatShortDate(slice[0].key, { month: 'short', day: 'numeric' })}`,
        calories: round(sum(slice.map((day) => day.activeCalories)), 0),
        minutes: round(sum(slice.map((day) => day.workoutMinutes)), 0),
        steps: round(sum(slice.map((day) => day.steps)), 0),
        sessions: sum(slice.map((day) => day.sessions)),
        water: round(sum(slice.map((day) => day.waterMl)) / 1000, 1),
      })
    }
    return { summaries: daily, buckets: grouped }
  }, [data.sessions, data.meals, data.water, data.steps, days, bucketSize])

  const weightSeries = useMemo(() => {
    const cutoff = lastNDays(days)[0]
    return fitness.body.series
      .filter((entry) => entry.date >= cutoff)
      .map((entry) => ({ label: formatShortDate(entry.date, { month: 'short', day: 'numeric' }), weight: entry.weightKg }))
  }, [fitness.body.series, days])

  const bodyFatSeries = useMemo(() => {
    const cutoff = lastNDays(days)[0]
    return fitness.body.series
      .filter((entry) => entry.date >= cutoff && typeof entry.bodyFat === 'number')
      .map((entry) => ({ label: formatShortDate(entry.date, { month: 'short', day: 'numeric' }), bodyFat: entry.bodyFat as number }))
  }, [fitness.body.series, days])

  const totals = useMemo(
    () => ({
      sessions: sum(summaries.map((day) => day.sessions)),
      minutes: round(sum(summaries.map((day) => day.workoutMinutes)), 0),
      calories: round(sum(summaries.map((day) => day.activeCalories)), 0),
      steps: round(sum(summaries.map((day) => day.steps)), 0),
      water: round(sum(summaries.map((day) => day.waterMl)) / 1000, 1),
    }),
    [summaries],
  )

  const avgSteps = summaries.length ? Math.round(totals.steps / summaries.length) : 0
  const bestStepDay = summaries.reduce((best, day) => (day.steps > best.steps ? day : best), summaries[0] ?? { key: '', steps: 0 })
  const weeklyFrequency = useMemo(() => {
    const groups: { label: string; sessions: number }[] = []
    for (let i = 0; i < summaries.length; i += 7) {
      const slice = summaries.slice(i, i + 7)
      groups.push({
        label: `W${groups.length + 1}`,
        sessions: sum(slice.map((day) => day.sessions)),
      })
    }
    return groups.slice(-12)
  }, [summaries])

  const weightDelta = weightChange(data.body, days)

  const weightDomain = useMemo<[number | 'auto', number | 'auto']>(() => {
    const values = weightSeries.map((point) => point.weight)
    if (!values.length) return ['auto', 'auto']
    return [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)]
  }, [weightSeries])

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonStatRow count={4} />
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
    )
  }

  if (!data.sessions.length && !data.body.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Progress" subtitle="Statistics appear as soon as you log your first session or measurement." />
        <EmptyState
          icon={<ChartLine size={22} />}
          title="No data to chart yet"
          description="Complete a workout or add a body measurement and your progress dashboard will fill up automatically."
          action={<LinkButton to="/workouts" icon={<Dumbbell size={16} />}>Start a workout</LinkButton>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress"
        subtitle={`${RANGE_LABELS[range]} of training, movement and body trends`}
        action={<Segmented ariaLabel="Date range" value={range} onChange={setRange} options={(Object.keys(RANGE_LABELS) as Range[]).map((key) => ({ value: key, label: RANGE_LABELS[key] }))} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Workouts', value: `${totals.sessions}`, sub: `${round(totals.sessions / (days / 7), 1)} per week`, icon: Dumbbell, tone: 'brand' },
          { label: 'Active time', value: `${(totals.minutes / 60).toFixed(1)}h`, sub: `${totals.minutes} minutes`, icon: Clock, tone: 'violet' },
          { label: 'Calories burned', value: totals.calories.toLocaleString('en-US'), sub: 'across logged sessions', icon: Flame, tone: 'calorie' },
          { label: 'Steps', value: formatSteps(totals.steps), sub: `${formatSteps(avgSteps)} avg / day`, icon: Footprints, tone: 'water' },
        ].map((tile) => (
          <Card key={tile.label} className="p-4">
            <div className="flex items-center gap-2 text-muted">
              <tile.icon size={16} aria-hidden />
              <p className="text-[11px] font-bold tracking-wide uppercase">{tile.label}</p>
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">{tile.value}</p>
            <p className="text-xs text-muted">{tile.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          title="Weight progress"
          subtitle={`${weightDelta === 0 ? 'Stable' : `${weightDelta > 0 ? '+' : ''}${weightDelta} kg`} over ${RANGE_LABELS[range].toLowerCase()}`}
          icon={<TrendingUp size={18} className="text-amber-500" />}
          action={<LinkButton to="/body" variant="ghost" size="sm">Body tracker</LinkButton>}
        >
          {weightSeries.length > 1 ? (
            <TrendLine
              data={weightSeries}
              dataKey="weight"
              name="Weight"
              unit=" kg"
              tone="violet"
              yDomain={weightDomain}
            />
          ) : (
            <EmptyState compact icon={<Ruler size={20} />} title="Add at least two weight entries" description="Log your weight in the body tracker to see the trend." />
          )}
        </ChartCard>

        <ChartCard
          title="Calories burned"
          subtitle="Active calories from logged workouts"
          icon={<Flame size={18} className="text-orange-500" />}
        >
          <TrendArea data={buckets} dataKey="calories" name="Calories" unit=" kcal" tone="calorie" />
        </ChartCard>

        <ChartCard
          title="Workout frequency"
          subtitle={`${totals.sessions} sessions in ${RANGE_LABELS[range].toLowerCase()}`}
          icon={<Activity size={18} className="text-emerald-600 dark:text-emerald-400" />}
        >
          <SeriesBars data={weeklyFrequency} dataKey="sessions" name="Sessions / week" tone="brand" targetValue={user?.profile.targets.weeklyWorkouts} />
        </ChartCard>

        <ChartCard
          title="Workout duration"
          subtitle="Minutes trained per period"
          icon={<Clock size={18} className="text-violet-500" />}
        >
          <SeriesBars data={buckets} dataKey="minutes" name="Minutes" unit=" min" tone="violet" />
        </ChartCard>

        <ChartCard
          title="Daily steps"
          subtitle={bestStepDay?.key ? `Best day ${formatShortDate(bestStepDay.key)} · ${formatSteps(bestStepDay.steps)} steps` : 'No step data yet'}
          icon={<Footprints size={18} className="text-sky-500" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={15} />}
              onClick={() => {
                const gained = 250 + Math.round(Math.random() * 650)
                actions.nudgeSteps(gained)
                toast.success('Steps synced', `${formatSteps(gained)} new steps imported from your tracker.`)
              }}
            >
              Sync
            </Button>
          }
        >
          <SeriesBars
            data={summaries.map((day) => ({ label: bucketSize === 1 ? weekdayShort(day.key) : formatShortDate(day.key), steps: day.steps }))}
            dataKey="steps"
            name="Steps"
            tone="water"
            targetValue={user?.profile.targets.stepsGoal}
            xInterval={Math.max(0, Math.floor(summaries.length / 10))}
          />
        </ChartCard>

        <div className="space-y-5">
          <ChartCard
            title="Hydration"
            subtitle={`${totals.water}L logged in ${RANGE_LABELS[range].toLowerCase()}`}
            icon={<Percent size={18} className="text-water" />}
            height={200}
          >
            <SeriesBars data={buckets} dataKey="water" name="Litres" unit="L" tone="water" />
          </ChartCard>

          <ChartCard
            title="Body composition"
            subtitle={bodyFatSeries.length ? `${bodyFatSeries[bodyFatSeries.length - 1].bodyFat}% estimated body fat` : 'Add measurements to estimate body fat'}
            icon={<Award size={18} className="text-rose-500" />}
            height={200}
          >
            {bodyFatSeries.length > 1 ? (
              <TrendLine data={bodyFatSeries} dataKey="bodyFat" name="Body fat" unit="%" tone="rose" />
            ) : (
              <EmptyState compact icon={<Ruler size={20} />} title="Not enough data" description="Two or more entries unlock this chart." />
            )}
          </ChartCard>
        </div>
      </div>

      <Card className="p-5">
        <SectionHeader title="Consistency" subtitle="How reliable your weekly rhythm has been" icon={<Percent size={18} className="text-emerald-600 dark:text-emerald-400" />} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface2/50 p-4">
            <p className="text-xs font-semibold text-muted">Current streak</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{fitness.streak.current} days</p>
            <p className="text-xs text-muted">Longest {fitness.streak.longest} days</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface2/50 p-4">
            <p className="text-xs font-semibold text-muted">Weekly target hit</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">
              {fitness.week.sessions}/{user?.profile.targets.weeklyWorkouts}
            </p>
            <p className="text-xs text-muted">{Math.round(fitness.week.goalProgress)}% of this week’s plan</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface2/50 p-4">
            <p className="text-xs font-semibold text-muted">Avg session length</p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">
              {totals.sessions ? Math.round(totals.minutes / totals.sessions) : 0} min
            </p>
            <p className="text-xs text-muted">Personalised for your level</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
