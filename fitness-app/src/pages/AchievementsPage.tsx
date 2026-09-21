import { useMemo, useState } from 'react'
import { Award, Flame, Lock, Sparkles, Trophy, Zap } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { Segmented } from '../components/ui/Segmented'
import { SkeletonCard } from '../components/ui/Skeleton'
import { StreakStrip } from '../components/dashboard/StreakStrip'
import { Confetti } from '../components/ui/Confetti'
import { TIER_STYLES } from '../lib/achievements'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useMountLoading } from '../hooks/useMountLoading'
import { cn, percent, relativeTime } from '../lib/utils'

type Filter = 'all' | 'unlocked' | 'locked'

export default function AchievementsPage() {
  const { data } = useApp()
  const fitness = useFitness()
  const loading = useMountLoading(240)
  const [filter, setFilter] = useState<Filter>('all')
  const [celebrate, setCelebrate] = useState(false)

  const achievements = fitness.achievements
  const unlocked = achievements.filter((item) => item.unlocked)
  const list = useMemo(
    () =>
      filter === 'unlocked' ? unlocked : filter === 'locked' ? achievements.filter((item) => !item.unlocked) : achievements,
    [achievements, filter, unlocked],
  )

  const latestUnlock = useMemo(
    () =>
      [...unlocked]
        .filter((item) => item.unlockedAt)
        .sort((a, b) => (a.unlockedAt! < b.unlockedAt! ? 1 : -1))[0] ?? null,
    [unlocked],
  )

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonCard className="h-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} className="h-44" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {celebrate ? <Confetti count={60} /> : null}

      <PageHeader
        title="Achievements"
        subtitle={`${unlocked.length} of ${achievements.length} badges unlocked`}
        action={
          <Segmented
            ariaLabel="Filter achievements"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'unlocked', label: 'Unlocked' },
              { value: 'locked', label: 'Locked' },
            ]}
          />
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card className="flex flex-col items-center gap-5 p-6 sm:flex-row">
          <ProgressRing value={percent(unlocked.length, achievements.length)} size={148} stroke={13} tone="amber" label="Achievements unlocked">
            <div>
              <p className="font-display text-2xl font-extrabold tabular-nums">
                {unlocked.length}/{achievements.length}
              </p>
              <p className="text-[11px] font-semibold text-muted">Badges</p>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <SectionHeader title={`${fitness.level.name} level`} subtitle={`${fitness.level.xp} XP earned from training`} icon={<Zap size={18} className="text-amber-500" />} />
            <ProgressBar value={fitness.level.progress} tone="amber" label="Level progress" showValue />
            <p className="mt-3 text-xs text-muted">
              {fitness.level.nextAt
                ? `${fitness.level.nextAt - fitness.level.xp} XP to the next level. Keep logging sessions and steps.`
                : 'You have reached the highest level. Legend status!'}
            </p>
            {latestUnlock ? (
              <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-500/8 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Sparkles size={14} aria-hidden />
                Latest: {latestUnlock.emoji} {latestUnlock.name} · {latestUnlock.unlockedAt ? relativeTime(latestUnlock.unlockedAt) : ''}
              </p>
            ) : null}
          </div>
        </Card>

        <StreakStrip
          streak={fitness.streak}
          weekKeys={fitness.week.keys}
          plannedPerWeek={fitness.targets.weeklyWorkouts}
          today={fitness.key}
        />
      </div>

      <section>
        <SectionHeader title="Badge collection" subtitle="Every badge you can earn" icon={<Trophy size={18} className="text-amber-500" />} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((achievement) => {
            const tier = TIER_STYLES[achievement.tier]
            return (
              <li key={achievement.id}>
                <Card
                  className={cn(
                    'relative h-full overflow-hidden p-5 transition-all duration-300',
                    achievement.unlocked ? 'border-emerald-500/30' : 'opacity-90',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        'grid size-14 place-items-center rounded-3xl text-2xl ring-1',
                        achievement.unlocked ? cn(tier.bg, tier.ring) : 'bg-surface2 text-muted ring-line',
                      )}
                      aria-hidden
                    >
                      {achievement.unlocked ? achievement.emoji : <Lock size={20} />}
                    </span>
                    <Badge tone={achievement.unlocked ? 'brand' : 'neutral'}>{achievement.unlocked ? 'Unlocked' : tier.label}</Badge>
                  </div>

                  <p className="mt-3.5 text-sm font-bold">{achievement.name}</p>
                  <p className="mt-1 text-xs text-muted">{achievement.description}</p>

                  {achievement.unlocked ? (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Award size={13} aria-hidden />
                      Earned {achievement.unlockedAt ? relativeTime(achievement.unlockedAt) : 'recently'}
                    </p>
                  ) : (
                    <div className="mt-3">
                      <ProgressBar value={achievement.progress} tone="amber" size="sm" showValue label={`${achievement.name} progress`} />
                      <p className="mt-1.5 text-[11px] text-muted tabular-nums">
                        {achievement.value.toLocaleString('en-US')} / {achievement.threshold.toLocaleString('en-US')}
                      </p>
                    </div>
                  )}

                  <span
                    className={cn('absolute inset-x-0 bottom-0 h-1', achievement.unlocked ? 'bg-emerald-500' : 'bg-surface3')}
                    aria-hidden
                  />
                </Card>
              </li>
            )
          })}
        </ul>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-orange-500/12 text-orange-500">
            <Flame size={20} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold">Streak rewards</p>
            <p className="text-xs text-muted">
              You are on a {fitness.streak.current} day streak — badges unlock automatically at 3, 7 and 30 days.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setCelebrate(true)
            window.setTimeout(() => setCelebrate(false), 4000)
          }}
          icon={<Sparkles size={16} />}
        >
          Celebrate progress
        </Button>
      </Card>

      <p className="pb-2 text-center text-xs text-muted">Badges use data from {data.sessions.length} sessions, {data.steps.length} step records and {data.water.length} hydration logs.</p>
    </div>
  )
}
