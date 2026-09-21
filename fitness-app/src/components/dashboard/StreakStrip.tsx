import { Check, Flame } from 'lucide-react'
import { Card } from '../ui/Card'
import { cn, fromKey, percent, weekdayLetter, weekdayShort } from '../../lib/utils'
import type { StreakInfo } from '../../lib/fitness'
import { ProgressRing } from '../ui/Progress'

export function StreakStrip({
  streak,
  weekKeys,
  plannedPerWeek,
  today,
}: {
  streak: StreakInfo
  weekKeys: string[]
  plannedPerWeek: number
  today: string
}) {
  const active = new Set(streak.activeDates)
  const completedThisWeek = weekKeys.filter((key) => active.has(key)).length

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <span className="grid size-9 place-items-center rounded-2xl bg-orange-500/12 text-orange-500">
              <Flame size={18} aria-hidden />
            </span>
            {streak.current} day streak
          </p>
          <p className="mt-2 text-xs text-muted">
            Best run {streak.longest} {streak.longest === 1 ? 'day' : 'days'} ·{' '}
            {streak.todayActive ? 'today counts' : 'train today to extend it'}
          </p>
        </div>
        <ProgressRing value={percent(completedThisWeek, plannedPerWeek)} size={64} stroke={7} tone="calorie" label="Weekly streak progress">
          <span className="text-xs font-bold tabular-nums">
            {completedThisWeek}/{plannedPerWeek}
          </span>
        </ProgressRing>
      </div>

      <ul className="mt-5 grid grid-cols-7 gap-1.5">
        {weekKeys.map((key) => {
          const isActive = active.has(key)
          const isToday = key === today
          const isFuture = fromKey(key) > new Date(today)
          return (
            <li key={key} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wide text-muted uppercase">{weekdayLetter(key)}</span>
              <span
                className={cn(
                  'grid size-9 place-items-center rounded-xl border text-xs font-bold transition-colors',
                  isActive
                    ? 'border-transparent bg-emerald-500 text-emerald-950'
                    : isFuture
                      ? 'border-dashed border-line text-muted/50'
                      : 'border-line bg-surface2 text-muted',
                  isToday && !isActive && 'ring-2 ring-emerald-500/40',
                )}
                title={`${weekdayShort(key)} — ${isActive ? 'active' : 'rest day'}`}
              >
                {isActive ? <Check size={15} aria-hidden /> : isToday ? '•' : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
