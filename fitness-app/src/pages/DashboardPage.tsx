import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Clock,
  Dumbbell,
  Droplets,
  Flame,
  Footprints,
  MapPin,
  Play,
  Plus,
  Ruler,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Button, LinkButton } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { SkeletonCard, SkeletonStatRow } from '../components/ui/Skeleton'
import { ChartCard, SeriesBars } from '../components/charts/Charts'
import { DailyGoalCard } from '../components/dashboard/DailyGoalCard'
import { StreakStrip } from '../components/dashboard/StreakStrip'
import { WorkoutCard } from '../components/workout/WorkoutCard'
import { SessionRow } from '../components/sessions/SessionItem'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { useToast } from '../components/ui/Toast'
import { formatMl, formatSteps, formatWeight, greeting, percent, round, weekdayShort } from '../lib/utils'
import { GOAL_META } from '../lib/fitness'
import { TONES } from '../components/ui/tokens'

export default function DashboardPage() {
  const { user, data, actions } = useApp()
  const fitness = useFitness()
  const toast = useToast()
  const navigate = useNavigate()
  const loading = useMountLoading()

  const { today, targets, streak, week, body, recommended, achievements, unlockedCount, level } = fitness

  const weekChart = useMemo(
    () =>
      week.summaries.map((day) => ({
        label: weekdayShort(day.key),
        minutes: day.workoutMinutes,
        calories: day.activeCalories,
      })),
    [week.summaries],
  )

  const recentSessions = useMemo(() => [...data.sessions].sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1)).slice(0, 4), [data.sessions])

  const firstName = (user?.name ?? 'Athlete').split(' ')[0]
  const goalMeta = GOAL_META[user?.profile.goal ?? 'improve-fitness']
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const weightTrend = body.change7

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonCard className="h-36" />
        <SkeletonStatRow />
        <SkeletonCard className="h-72" />
      </div>
    )
  }

  const addWater = (ml: number) => {
    actions.logWater(ml)
    const total = today.waterMl + ml
    if (total >= targets.waterGoalMl && today.waterMl < targets.waterGoalMl) {
      toast.success('Hydration goal reached! 💧', `${formatMl(total)} of ${formatMl(targets.waterGoalMl)} logged today.`)
    } else {
      toast.success(`+${ml}ml logged`, `${formatMl(total)} of ${formatMl(targets.waterGoalMl)} today.`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        subtitle={`${todayLabel} · ${goalMeta.emoji} ${goalMeta.label}`}
        action={
          <>
            <Badge tone="violet" icon={<Sparkles size={13} />} className="hidden sm:inline-flex">
              {level.name} · {level.xp} XP
            </Badge>
            <LinkButton to="/workouts" icon={<Play size={16} />}>
              Start workout
            </LinkButton>
          </>
        }
      />

      {/* continue an in-progress workout */}
      {data.activeSession ? (
        <Card className="flex flex-wrap items-center gap-4 border-emerald-500/40 bg-emerald-500/6 p-4">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 text-emerald-950">
            <Timer size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Workout in progress — {data.activeSession.title}</p>
            <p className="text-xs text-muted">
              Exercise {data.activeSession.index + 1} of {data.activeSession.exercises.length}
              {data.activeSession.paused ? ' · paused' : ''}
            </p>
          </div>
          <Button onClick={() => navigate('/active-workout')} icon={<Play size={16} />}>
            Resume
          </Button>
        </Card>
      ) : null}

      {/* today's goal + streak */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <DailyGoalCard
          completion={today.completion}
          calories={{ value: today.caloriesBurned, goal: Math.max(200, round(targets.caloriesGoal * 0.25, 0)) }}
          steps={{ value: today.steps, goal: targets.stepsGoal }}
          water={{ value: today.waterMl, goal: targets.waterGoalMl }}
          minutes={{ value: today.minutes, goal: targets.dailyMinutes }}
          targets={targets}
        />
        <div className="space-y-5">
          <StreakStrip streak={streak} weekKeys={week.keys} plannedPerWeek={targets.weeklyWorkouts} today={today.key} />

          <Card className="p-5">
            <SectionHeader
              title="Quick hydration"
              subtitle={`${formatMl(today.waterMl)} of ${formatMl(targets.waterGoalMl)} today`}
              icon={<Droplets size={18} className="text-sky-500" />}
              className="mb-3"
            />
            <div className="grid grid-cols-3 gap-2">
              {[250, 500, 750].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => addWater(ml)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface2/60 py-3 text-xs font-bold transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/10 active:scale-95"
                >
                  <Plus size={15} className="text-sky-500" aria-hidden />
                  {ml}ml
                </button>
              ))}
            </div>
            <Link to="/water" className="mt-3 flex items-center justify-between text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400">
              Open the water tracker
              <ArrowRight size={14} aria-hidden />
            </Link>
          </Card>
        </div>
      </div>

      {/* quick links for small screens — desktop reach is covered by the sidebar */}
      <nav aria-label="Quick links" className="lg:hidden">
        <ul className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {[
            { to: '/water', label: 'Water', icon: Droplets, tone: 'water' as const },
            { to: '/goals', label: 'Goals', icon: Target, tone: 'violet' as const },
            { to: '/body', label: 'Body', icon: Ruler, tone: 'amber' as const },
            { to: '/achievements', label: 'Badges', icon: Trophy, tone: 'brand' as const },
            { to: '/history', label: 'History', icon: Clock, tone: 'neutral' as const },
            { to: '/progress', label: 'Stats', icon: Activity, tone: 'brand' as const },
          ].map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-surface2"
              >
                <item.icon size={16} className={TONES[item.tone].text} aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="Calories"
          value={today.caloriesBurned.toLocaleString('en-US')}
          unit="kcal"
          goal={`consumed ${today.caloriesConsumed} kcal`}
          icon={<Flame size={18} />}
          tone="calorie"
          progress={percent(today.caloriesBurned, Math.max(200, targets.caloriesGoal * 0.25))}
          to="/nutrition"
        />
        <StatCard
          label="Steps"
          value={formatSteps(today.steps)}
          unit={`/ ${formatSteps(targets.stepsGoal)}`}
          goal={`${percent(today.steps, targets.stepsGoal).toFixed(0)}% of daily goal`}
          icon={<Footprints size={18} />}
          tone="brand"
          progress={percent(today.steps, targets.stepsGoal)}
          to="/progress"
        />
        <StatCard
          label="Water"
          value={(today.waterMl / 1000).toFixed(1)}
          unit={`L / ${(targets.waterGoalMl / 1000).toFixed(1)}L`}
          goal={`${percent(today.waterMl, targets.waterGoalMl).toFixed(0)}% hydrated`}
          icon={<Droplets size={18} />}
          tone="water"
          progress={percent(today.waterMl, targets.waterGoalMl)}
          to="/water"
        />
        <StatCard
          label="Workout"
          value={round(today.minutes, 0)}
          unit="min"
          goal={`${today.sessionsToday.length} session${today.sessionsToday.length === 1 ? '' : 's'} today`}
          icon={<Dumbbell size={18} />}
          tone="violet"
          progress={percent(today.minutes, targets.dailyMinutes)}
          to="/history"
        />
        <StatCard
          label="Weight"
          value={formatWeight(body.latest?.weightKg ?? fitness.weightKg, 'metric', 1).replace(' kg', '')}
          unit="kg"
          goal={`BMI ${body.bmi} · ${body.change30 >= 0 ? '+' : ''}${body.change30} kg / 30d`}
          icon={weightTrend <= 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
          tone="amber"
          trend={{ value: `${Math.abs(weightTrend)} kg`, direction: weightTrend < 0 ? 'down' : weightTrend > 0 ? 'up' : 'flat' }}
          to="/body"
        />
      </div>

      {/* weekly activity + report */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title="This week’s training"
          subtitle={`${week.sessions}/${targets.weeklyWorkouts} sessions · ${week.minutes} min · ${week.calories} kcal`}
          icon={<CalendarCheck size={18} className="text-emerald-600 dark:text-emerald-400" />}
        >
          <SeriesBars data={weekChart} dataKey="minutes" name="Active minutes" tone="brand" unit=" min" />
        </ChartCard>

        <Card className="p-5">
          <SectionHeader title="Weekly report" subtitle="Your last 7 days at a glance" icon={<Trophy size={18} className="text-amber-500" />} />
          <dl className="space-y-3">
            {[
              { label: 'Workouts completed', value: `${week.sessions}`, tone: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Active minutes', value: `${week.minutes} min`, tone: 'text-violet-600 dark:text-violet-400' },
              { label: 'Calories burned', value: `${week.calories} kcal`, tone: 'text-orange-600 dark:text-orange-400' },
              { label: 'Steps walked', value: formatSteps(week.steps), tone: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Water logged', value: formatMl(week.water), tone: 'text-sky-600 dark:text-sky-400' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-line pb-2.5 last:border-0 last:pb-0">
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className={`text-sm font-bold tabular-nums ${row.tone}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <LinkButton to="/progress" variant="secondary" full className="mt-4" icon={<ArrowRight size={16} />}>
            View full statistics
          </LinkButton>
        </Card>
      </div>

      {/* recommended workouts */}
      <section>
        <SectionHeader
          title="Recommended for you"
          subtitle={`Matched to your ${goalMeta.label.toLowerCase()} goal and ${user?.profile.place ?? 'home'} preference`}
          action={
            <LinkButton to="/workouts" variant="ghost" icon={<ArrowRight size={16} />}>
              All workouts
            </LinkButton>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} weightKg={fitness.weightKg} recommended />
          ))}
        </div>
      </section>

      {/* recent activity + achievements */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Recent activity"
            subtitle="Your latest logged sessions"
            action={
              <LinkButton to="/history" variant="ghost" size="sm" icon={<ArrowRight size={15} />}>
                History
              </LinkButton>
            }
          />
          {recentSessions.length ? (
            <ul className="space-y-2.5">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <SessionRow session={session} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Dumbbell size={22} />}
              title="No workouts completed today."
              description="Pick a session and your first rep is the hardest part — after that it’s momentum."
              action={
                <LinkButton to="/workouts" icon={<Play size={16} />}>
                  Start Your First Workout
                </LinkButton>
              }
            />
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Achievements"
            subtitle={`${unlockedCount} of ${achievements.length} unlocked`}
            action={
              <LinkButton to="/achievements" variant="ghost" size="sm" icon={<ArrowRight size={15} />}>
                All
              </LinkButton>
            }
          />
          <ul className="grid grid-cols-4 gap-2">
            {achievements.slice(0, 8).map((achievement) => (
              <li
                key={achievement.id}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center ${
                  achievement.unlocked ? 'border-emerald-500/30 bg-emerald-500/8' : 'border-dashed border-line opacity-55'
                }`}
                title={`${achievement.name} — ${achievement.description}`}
              >
                <span className="text-xl" aria-hidden>
                  {achievement.emoji}
                </span>
                <span className="text-[10px] leading-tight font-bold">{achievement.unlocked ? achievement.name : `${achievement.progress}%`}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-surface2/60 p-3 text-xs text-muted">
            <MapPin size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Training mostly {user?.profile.place}. Change your preference any time in Profile.
          </p>
        </Card>
      </div>
    </div>
  )
}
