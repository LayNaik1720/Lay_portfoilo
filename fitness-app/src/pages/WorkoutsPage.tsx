import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Dumbbell, Funnel, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Segmented } from '../components/ui/Segmented'
import { SkeletonCard } from '../components/ui/Skeleton'
import { WorkoutCard } from '../components/workout/WorkoutCard'
import { EQUIPMENT_LIST, MUSCLE_GROUPS } from '../lib/exercises'
import { WORKOUTS, WORKOUT_CATEGORIES, recommendWorkouts, workoutCalories } from '../lib/workouts'
import type { Difficulty, Equipment, MuscleGroup, WorkoutCategory, WorkoutPlace } from '../lib/types'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { cn } from '../lib/utils'

type SortKey = 'recommended' | 'duration' | 'calories' | 'difficulty'
type DurationBucket = 'short' | 'medium' | 'long'

const DURATION_LABELS: Record<DurationBucket, string> = {
  short: 'Under 25 min',
  medium: '25 – 40 min',
  long: '45 min +',
}

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']
const PLACES: { key: WorkoutPlace; label: string }[] = [
  { key: 'gym', label: 'Gym' },
  { key: 'home', label: 'Home' },
  { key: 'outdoor', label: 'Outdoor' },
]

export default function WorkoutsPage() {
  const { user } = useApp()
  const fitness = useFitness()
  const loading = useMountLoading(280)
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState<WorkoutCategory | 'All'>(() => {
    const value = params.get('category')
    return (value as WorkoutCategory) ?? 'All'
  })
  const [muscles, setMuscles] = useState<MuscleGroup[]>([])
  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [durations, setDurations] = useState<DurationBucket[]>([])
  const [places, setPlaces] = useState<WorkoutPlace[]>([])
  const [sort, setSort] = useState<SortKey>('recommended')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // keep the search box in sync when arriving from the topbar search
  useEffect(() => {
    const next = params.get('q') ?? ''
    setQuery(next)
  }, [params])

  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    if (category !== 'All') next.set('category', category)
    setParams(next, { replace: true })
  }, [query, category, setParams])

  const toggle = <T,>(list: T[], value: T, setter: (next: T[]) => void) =>
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])

  const activeFilterCount =
    muscles.length + difficulties.length + equipment.length + durations.length + places.length + (category !== 'All' ? 1 : 0)

  const clearAll = () => {
    setMuscles([])
    setDifficulties([])
    setEquipment([])
    setDurations([])
    setPlaces([])
    setCategory('All')
    setSort('recommended')
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = WORKOUTS.filter((workout) => {
      if (category !== 'All' && workout.category !== category) return false
      if (difficulties.length && !difficulties.includes(workout.difficulty)) return false
      if (places.length && !workout.place.some((place) => places.includes(place))) return false
      if (muscles.length && !workout.focus.some((group) => muscles.includes(group))) return false
      if (equipment.length && !workout.equipment.some((item) => equipment.includes(item))) return false
      if (durations.length) {
        const minutes = workout.durationMin
        const bucket: DurationBucket = minutes < 25 ? 'short' : minutes <= 40 ? 'medium' : 'long'
        if (!durations.includes(bucket)) return false
      }
      if (term) {
        const haystack = [
          workout.title,
          workout.category,
          workout.description,
          workout.difficulty,
          ...workout.focus,
          ...workout.equipment,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })

    const weight = fitness.weightKg || 75
    switch (sort) {
      case 'duration':
        return [...list].sort((a, b) => a.durationMin - b.durationMin)
      case 'calories':
        return [...list].sort((a, b) => workoutCalories(b, weight) - workoutCalories(a, weight))
      case 'difficulty': {
        const order: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']
        return [...list].sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))
      }
      default: {
        const recommended = recommendWorkouts(WORKOUTS, {
          goal: user?.profile.goal ?? 'improve-fitness',
          experience: user?.profile.experience ?? 'beginner',
          place: user?.profile.place ?? 'home',
        }, WORKOUTS.length)
        const rank = new Map(recommended.map((workout, index) => [workout.id, index]))
        return [...list].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
      }
    }
  }, [query, category, difficulties, places, muscles, equipment, durations, sort, fitness.weightKg, user?.profile])

  const filtersBody = (
    <div className="space-y-5">
      <FilterGroup
        title="Muscle group"
        options={MUSCLE_GROUPS}
        values={MUSCLE_GROUPS}
        selected={muscles}
        onToggle={(value) => toggle(muscles, value, setMuscles)}
      />
      <FilterGroup
        title="Difficulty"
        options={DIFFICULTIES}
        values={DIFFICULTIES}
        selected={difficulties}
        onToggle={(value) => toggle(difficulties, value, setDifficulties)}
      />
      <FilterGroup
        title="Duration"
        options={(['short', 'medium', 'long'] as DurationBucket[]).map((bucket) => DURATION_LABELS[bucket])}
        values={['short', 'medium', 'long'] as DurationBucket[]}
        selected={durations}
        onToggle={(value) => toggle(durations, value, setDurations)}
      />
      <FilterGroup
        title="Equipment"
        options={EQUIPMENT_LIST}
        values={EQUIPMENT_LIST}
        selected={equipment}
        onToggle={(value) => toggle(equipment, value, setEquipment)}
      />
      <FilterGroup
        title="Training place"
        options={PLACES.map((place) => place.label)}
        values={PLACES.map((place) => place.key)}
        selected={places}
        onToggle={(value) => toggle(places, value, setPlaces)}
      />
      <Button variant="ghost" full onClick={clearAll} icon={<X size={16} />}>
        Clear all filters
      </Button>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workouts"
        subtitle={`${WORKOUTS.length} guided sessions across strength, cardio, HIIT, yoga and mobility.`}
        action={
          <>
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
              icon={<Funnel size={16} />}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button
              variant="outline"
              className="hidden lg:inline-flex"
              onClick={() => setFiltersOpen(true)}
              icon={<SlidersHorizontal size={16} />}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
          </>
        }
      />

      {/* search + sort */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search workouts</span>
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, muscle, equipment…"
              className="h-12 w-full rounded-2xl border border-line bg-surface2 pr-10 pl-11 text-sm transition-colors focus:border-emerald-500/60 focus:bg-surface focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </label>

          <Segmented
            ariaLabel="Sort workouts"
            className="lg:w-auto"
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'recommended', label: 'For you' },
              { value: 'duration', label: 'Shortest' },
              { value: 'calories', label: 'Burn' },
              { value: 'difficulty', label: 'Level' },
            ]}
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar" role="tablist" aria-label="Workout categories">
          <Chip active={category === 'All'} onClick={() => setCategory('All')}>
            All
          </Chip>
          {WORKOUT_CATEGORIES.map((item) => (
            <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
              {item}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">
          {filtered.length} {filtered.length === 1 ? 'workout' : 'workouts'} found
        </p>
        {activeFilterCount ? (
          <button type="button" onClick={clearAll} className="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
            Clear filters
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} className="h-72" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} weightKg={fitness.weightKg} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Dumbbell size={22} />}
          title="No workouts match those filters"
          description="Try widening the difficulty range or clearing a filter or two."
          action={
            <Button onClick={clearAll} icon={<Sparkles size={16} />}>
              Reset filters
            </Button>
          }
        />
      )}

      {/* desktop filter drawer */}
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter workouts"
        description="Combine any filters — results update instantly."
        footer={
          <>
            <Button variant="ghost" onClick={clearAll}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show {filtered.length} results</Button>
          </>
        }
      >
        {filtersBody}
      </Modal>
    </div>
  )
}

function FilterGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
  values,
}: {
  title: string
  /** visible labels */
  options: string[]
  selected: T[]
  onToggle: (value: T) => void
  /** the actual values behind each label (defaults to labels cast to T) */
  values: T[]
}) {
  const keys = values
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const value = keys[index]
          const active = selected.includes(value)
          return (
            <button
              key={String(option)}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={active}
              className={cn(
                'inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'border-emerald-500 bg-emerald-500 text-emerald-950'
                  : 'border-line bg-surface2/60 text-ink2 hover:border-linestrong hover:text-ink',
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
