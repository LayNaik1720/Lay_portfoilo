import { Droplets, Dumbbell, Flame, Footprints } from 'lucide-react'
import { Card } from '../ui/Card'
import { ProgressRing } from '../ui/Progress'
import { TONES, type Tone } from '../ui/tokens'
import { cn, formatMl, formatSteps, percent } from '../../lib/utils'

interface GoalRow {
  label: string
  value: string
  target: string
  current: number
  goal: number
  tone: Tone
  icon: typeof Flame
}

export function DailyGoalCard({
  completion,
  calories,
  steps,
  water,
  minutes,
  targets,
}: {
  completion: number
  /** active-calorie burn vs the portion of the daily target that comes from training */
  calories: { value: number; goal: number }
  steps: { value: number; goal: number }
  water: { value: number; goal: number }
  minutes: { value: number; goal: number }
  targets: { caloriesGoal: number; stepsGoal: number; waterGoalMl: number; dailyMinutes: number }
}) {
  const rows: GoalRow[] = [
    {
      label: 'Calories burned',
      value: `${calories.value} / ${calories.goal} kcal`,
      target: `${calories.goal}`,
      current: calories.value,
      goal: calories.goal,
      tone: 'calorie',
      icon: Flame,
    },
    {
      label: 'Steps',
      value: `${formatSteps(steps.value)} / ${formatSteps(targets.stepsGoal)}`,
      target: `${targets.stepsGoal}`,
      current: steps.value,
      goal: targets.stepsGoal,
      tone: 'brand',
      icon: Footprints,
    },
    {
      label: 'Workout',
      value: `${Math.round(minutes.value)} / ${targets.dailyMinutes} min`,
      target: `${targets.dailyMinutes}`,
      current: minutes.value,
      goal: targets.dailyMinutes,
      tone: 'violet',
      icon: Dumbbell,
    },
    {
      label: 'Water',
      value: `${formatMl(water.value)} / ${formatMl(targets.waterGoalMl)}`,
      target: formatMl(targets.waterGoalMl),
      current: water.value,
      goal: targets.waterGoalMl,
      tone: 'water',
      icon: Droplets,
    },
  ]

  return (
    <Card className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:p-6">
      <ProgressRing value={completion} size={168} stroke={14} tone="brand" label="Today's goal completion">
        <div>
          <p className="font-display text-3xl font-extrabold tabular-nums">{Math.round(completion)}%</p>
          <p className="text-xs font-semibold text-muted">Today’s Goal</p>
        </div>
      </ProgressRing>

      <div className="w-full flex-1 space-y-3">
        {rows.map((row) => {
          const value = percent(row.current, row.goal)
          return (
            <div key={row.label} className="rounded-2xl border border-line bg-surface2/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-bold text-ink2">
                  <span className={cn('grid size-7 place-items-center rounded-lg', TONES[row.tone].soft, TONES[row.tone].text)}>
                    <row.icon size={14} aria-hidden />
                  </span>
                  {row.label}
                </span>
                <span className="text-xs font-bold text-muted tabular-nums">{Math.round(value)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface3">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(2, value)}%`, background: TONES[row.tone].hex }}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-muted tabular-nums">{row.value}</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
