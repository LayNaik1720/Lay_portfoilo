/* ------------------------------------------------------------------
   Derived fitness state. Everything the dashboard, progress page and
   goal pages show is calculated here from raw logged data — nothing is
   hard-coded in the UI layer.
------------------------------------------------------------------ */
import { useMemo } from 'react'
import { ACHIEVEMENTS } from '../lib/achievements'
import {
  achievementValue,
  buildAchievementStats,
  buildDaySummaries,
  calcBMI,
  caloriesForDay,
  computeStreak,
  estimateBodyFat,
  goalDaysLeft,
  goalPercent,
  latestBodyEntry,
  macrosForDay,
  minutesForDay,
  stepsForDay,
  waterForDay,
  weightChange,
} from '../lib/fitness'
import { activeDatesFrom } from '../lib/seed'
import type { Achievement } from '../lib/types'
import type { DaySummary, StreakInfo } from '../lib/fitness'
import { average, lastNDays, percent, round, todayKey, weekKeys } from '../lib/utils'
import { levelFor, useApp, xpFromData } from './AppStore'
import { WORKOUTS, recommendWorkouts } from '../lib/workouts'

export type { DaySummary, StreakInfo }

export interface AchievementView extends Achievement {
  unlocked: boolean
  unlockedAt?: string
  value: number
  progress: number
}

export function useFitness() {
  const { user, data } = useApp()
  const profile = user?.profile

  return useMemo(() => {
    const key = todayKey()
    const targets = profile?.targets ?? { caloriesGoal: 2200, stepsGoal: 10000, waterGoalMl: 2500, weeklyWorkouts: 5, dailyMinutes: 45 }
    const weightKg = latestBodyEntry(data.body)?.weightKg ?? profile?.weightKg ?? 0
    const heightCm = profile?.heightCm ?? 175

    const caloriesConsumed = caloriesForDay(data.meals, key)
    const caloriesBurned = round(
      data.sessions.filter((s) => s.date === key).reduce((acc, s) => acc + s.caloriesBurned, 0),
      0,
    )
    const steps = stepsForDay(data.steps, key)
    const waterMl = waterForDay(data.water, key)
    const minutes = minutesForDay(data.sessions, key)
    const sessionsToday = data.sessions.filter((s) => s.date === key)

    const streak = computeStreak(activeDatesFrom(data, targets.stepsGoal))

    const dayRatios = [
      percent(caloriesBurned, Math.max(200, targets.caloriesGoal * 0.25)),
      percent(steps, targets.stepsGoal),
      percent(waterMl, targets.waterGoalMl),
      percent(minutes, targets.dailyMinutes),
    ]
    const todayCompletion = round(average(dayRatios), 0)

    const last30 = lastNDays(30)
    const summaries30 = buildDaySummaries(data.sessions, data.meals, data.water, data.steps, last30)
    const thisWeek = weekKeys()
    const weekSummaries = buildDaySummaries(data.sessions, data.meals, data.water, data.steps, thisWeek)
    const sessionsThisWeek = data.sessions.filter((s) => thisWeek.includes(s.date)).length

    const bmi = calcBMI(weightKg, heightCm)
    const body = {
      latest: latestBodyEntry(data.body),
      bmi: round(bmi, 1),
      bodyFat: estimateBodyFat(bmi, profile?.age ?? 30, profile?.gender ?? 'male'),
      change30: weightChange(data.body, 30),
      change7: weightChange(data.body, 7),
      series: [...data.body].sort((a, b) => (a.date < b.date ? -1 : 1)),
    }

    const stats = buildAchievementStats({
      sessions: data.sessions,
      steps: data.steps,
      water: data.water,
      goals: data.goals,
      streak: streak.current,
    })
    const unlockedMap = new Map(data.achievements.map((a) => [a.id, a.unlockedAt]))
    const achievementViews: AchievementView[] = ACHIEVEMENTS.map((achievement) => {
      const value = achievementValue(achievement, stats)
      return {
        ...achievement,
        value,
        unlocked: unlockedMap.has(achievement.id),
        unlockedAt: unlockedMap.get(achievement.id),
        progress: round(percent(value, achievement.threshold), 0),
      }
    })

    const goals = data.goals.map((goal) => ({
      ...goal,
      percent: goalPercent(goal),
      daysLeft: goalDaysLeft(goal),
      remaining: goal.direction === 'increase' ? round(goal.target - goal.current, 1) : round(goal.current - goal.target, 1),
    }))

    const xp = xpFromData(data)
    const level = levelFor(xp)

    return {
      key,
      profile,
      targets,
      today: {
        key,
        caloriesConsumed,
        caloriesBurned,
        remainingCalories: Math.max(0, targets.caloriesGoal - caloriesConsumed + caloriesBurned),
        net: caloriesConsumed - caloriesBurned,
        steps,
        waterMl,
        minutes,
        sessionsToday,
        completion: todayCompletion,
        macros: macrosForDay(data.meals, key),
      },
      week: {
        keys: thisWeek,
        summaries: weekSummaries,
        sessions: sessionsThisWeek,
        minutes: round(weekSummaries.reduce((acc, d) => acc + d.workoutMinutes, 0), 0),
        calories: round(weekSummaries.reduce((acc, d) => acc + d.activeCalories, 0), 0),
        steps: round(weekSummaries.reduce((acc, d) => acc + d.steps, 0), 0),
        water: round(weekSummaries.reduce((acc, d) => acc + d.waterMl, 0), 0),
        goalProgress: percent(sessionsThisWeek, targets.weeklyWorkouts),
      },
      summaries30,
      summaries7: summaries30.slice(-7),
      streak,
      achievements: achievementViews,
      unlockedCount: achievementViews.filter((a) => a.unlocked).length,
      goals,
      activeGoals: goals.filter((g) => g.status !== 'archived'),
      body,
      weightKg,
      level,
      stats,
      recommended: recommendWorkouts(
        WORKOUTS,
        {
          goal: profile?.goal ?? 'improve-fitness',
          experience: profile?.experience ?? 'beginner',
          place: profile?.place ?? 'home',
        },
        4,
      ),
    }
  }, [data, profile, user])
}
