import { useMemo, useState } from 'react'
import { CalendarCheck, Dumbbell, Flame, ListOrdered, Search, Timer, X } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button, LinkButton } from '../components/ui/Button'
import { Chip } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonList } from '../components/ui/Skeleton'
import { SessionItem } from '../components/sessions/SessionItem'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { formatShortDate, formatSteps, round, sum } from '../lib/utils'

type Filter = 'all' | 'complete' | 'partial' | 'week'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All sessions' },
  { key: 'week', label: 'This week' },
  { key: 'complete', label: 'Fully completed' },
  { key: 'partial', label: 'Partially completed' },
]

export default function HistoryPage() {
  const { data } = useApp()
  const fitness = useFitness()
  const loading = useMountLoading(240)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const sessions = useMemo(() => {
    const term = query.trim().toLowerCase()
    return [...data.sessions]
      .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
      .filter((session) => {
        if (filter === 'week' && !fitness.week.keys.includes(session.date)) return false
        if (filter === 'complete' && session.completion < 90) return false
        if (filter === 'partial' && session.completion >= 90) return false
        if (term && !`${session.title} ${session.category}`.toLowerCase().includes(term)) return false
        return true
      })
  }, [data.sessions, filter, query, fitness.week.keys])

  const totals = useMemo(
    () => ({
      count: data.sessions.length,
      minutes: round(sum(data.sessions.map((session) => session.durationSec / 60)), 0),
      calories: round(sum(data.sessions.map((session) => session.caloriesBurned)), 0),
      sets: sum(data.sessions.map((session) => session.completedSets)),
      steps: round(sum(data.steps.map((entry) => entry.steps)), 0),
    }),
    [data.sessions, data.steps],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sessions>()
    sessions.forEach((session) => {
      const bucket = map.get(session.date) ?? []
      bucket.push(session)
      map.set(session.date, bucket)
    })
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [sessions])

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonList rows={4} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workout history"
        subtitle="Every session you have logged, with completion detail"
        action={<LinkButton to="/workouts" icon={<Dumbbell size={16} />}>Log a new session</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Sessions', value: `${totals.count}`, icon: CalendarCheck, tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Time trained', value: `${(totals.minutes / 60).toFixed(1)}h`, icon: Timer, tone: 'text-violet-600 dark:text-violet-400' },
          { label: 'Calories burned', value: totals.calories.toLocaleString('en-US'), icon: Flame, tone: 'text-orange-600 dark:text-orange-400' },
          { label: 'Steps recorded', value: formatSteps(totals.steps), icon: ListOrdered, tone: 'text-sky-600 dark:text-sky-400' },
        ].map((tile) => (
          <Card key={tile.label} className="p-4">
            <div className="flex items-center gap-2 text-muted">
              <tile.icon size={16} aria-hidden />
              <p className="text-[11px] font-bold tracking-wide uppercase">{tile.label}</p>
            </div>
            <p className={`mt-2 font-display text-xl font-extrabold tabular-nums ${tile.tone}`}>{tile.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search history</span>
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by workout name or category…"
              className="h-11 w-full rounded-2xl border border-line bg-surface2 pr-10 pl-11 text-sm focus:border-emerald-500/60 focus:bg-surface focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted hover:text-ink" aria-label="Clear search">
                <X size={16} />
              </button>
            ) : null}
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {FILTERS.map((item) => (
              <Chip key={item.key} active={filter === item.key} onClick={() => setFilter(item.key)}>
                {item.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      {grouped.length ? (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-muted">
                {date === fitness.key ? 'Today' : formatShortDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}
                <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-semibold">{items.length}</span>
              </h2>
              <ul className="space-y-3">
                {items.map((session) => (
                  <SessionItem key={session.id} session={session} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarCheck size={22} />}
          title={data.sessions.length ? 'No sessions match your filters' : 'No workouts logged yet'}
          description={
            data.sessions.length
              ? 'Try a different filter or clear the search to see your full history.'
              : 'Complete your first guided workout and it will appear here with full detail.'
          }
          action={
            data.sessions.length ? (
              <Button
                onClick={() => {
                  setFilter('all')
                  setQuery('')
                }}
              >
                Reset filters
              </Button>
            ) : (
              <LinkButton to="/workouts" icon={<Dumbbell size={16} />}>
                Start Your First Workout
              </LinkButton>
            )
          }
        />
      )}
    </div>
  )
}
