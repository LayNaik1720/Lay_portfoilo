/* ------------------------------------------------------------------
   Fitness science helpers: energy expenditure, targets, streaks,
   goal progress and achievement evaluation.
------------------------------------------------------------------ */
import type {
  Achievement,
  ActivityLevel,
  BodyEntry,
  FitnessGoal,
  Goal,
  Meal,
  SessionExercise,
  StepLog,
  UserProfile,
  WaterLog,
  WorkoutSession,
} from './types'
import { dateKey, lastNDays, percent, round, sum, todayKey, weekKeys } from './utils'

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
}

export const GOAL_META: Record<
  FitnessGoal,
  { label: string; short: string; blurb: string; emoji: string; calorieAdjust: number; proteinPerKg: number }
> = {
  'lose-weight': {
    label: 'Lose Weight',
    short: 'Lose Weight',
    blurb: 'Sustainable calorie deficit with high-protein training',
    emoji: '📉',
    calorieAdjust: -450,
    proteinPerKg: 1.9,
  },
  'build-muscle': {
    label: 'Build Muscle',
    short: 'Build Muscle',
    blurb: 'Progressive overload with a small calorie surplus',
    emoji: '💪',
    calorieAdjust: 300,
    proteinPerKg: 2,
  },
  'maintain-weight': {
    label: 'Maintain Weight',
    short: 'Maintain',
    blurb: 'Balanced intake with consistent training load',
    emoji: '⚖️',
    calorieAdjust: 0,
    proteinPerKg: 1.6,
  },
  'improve-fitness': {
    label: 'Improve Fitness',
    short: 'Improve Fitness',
    blurb: 'Mixed cardio and strength for all-round health',
    emoji: '❤️',
    calorieAdjust: -100,
    proteinPerKg: 1.6,
  },
  'increase-strength': {
    label: 'Increase Strength',
    short: 'Strength',
    blurb: 'Low reps, heavy loads, long rests',
    emoji: '🏋️',
    calorieAdjust: 200,
    proteinPerKg: 1.9,
  },
  'improve-endurance': {
    label: 'Improve Endurance',
    short: 'Endurance',
    blurb: 'Zone 2 volume with tempo and interval work',
    emoji: '🏃',
    calorieAdjust: 0,
    proteinPerKg: 1.5,
  },
}

export const ACTIVITY_META: Record<ActivityLevel, { label: string; blurb: string }> = {
  sedentary: { label: 'Sedentary', blurb: 'Desk job, little movement' },
  light: { label: 'Lightly Active', blurb: 'Light exercise 1–3 days a week' },
  moderate: { label: 'Moderately Active', blurb: 'Exercise 3–5 days a week' },
  very: { label: 'Very Active', blurb: 'Hard training 6–7 days a week' },
}

/* --------------------------- energy math --------------------------- */

export const calcBMR = (weightKg: number, heightCm: number, age: number, gender: 'male' | 'female' | 'other') => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (gender === 'male') return base + 5
  if (gender === 'female') return base - 161
  return base - 78
}

export const calcTDEE = (profile: Pick<UserProfile, 'weightKg' | 'heightCm' | 'age' | 'gender' | 'activityLevel'>) =>
  calcBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender) * ACTIVITY_FACTORS[profile.activityLevel]

export const calcBMI = (weightKg: number, heightCm: number) => {
  const m = heightCm / 100
  return m <= 0 ? 0 : weightKg / (m * m)
}

export const bmiCategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'text-water' }
  if (bmi < 25) return { label: 'Healthy', tone: 'text-brand' }
  if (bmi < 30) return { label: 'Overweight', tone: 'text-calorie' }
  return { label: 'Obese', tone: 'text-rose' }
}

/** rough body-fat estimate (Deurenberg) — good enough for a tracker */
export const estimateBodyFat = (bmi: number, age: number, gender: 'male' | 'female' | 'other') => {
  const sex = gender === 'male' ? 1 : 0
  return round(Math.max(4, 1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4), 1)
}

export const calcTargets = (
  profile: Pick<UserProfile, 'weightKg' | 'heightCm' | 'age' | 'gender' | 'activityLevel' | 'goal'>,
) => {
  const tdee = calcTDEE(profile)
  const meta = GOAL_META[profile.goal]
  const stepsGoal = profile.activityLevel === 'sedentary' ? 8000 : profile.activityLevel === 'light' ? 10000 : 12000
  const weeklyWorkouts =
    profile.activityLevel === 'sedentary' ? 3 : profile.activityLevel === 'light' ? 4 : profile.activityLevel === 'moderate' ? 5 : 6
  const dailyMinutes = profile.activityLevel === 'sedentary' ? 20 : profile.activityLevel === 'light' ? 30 : profile.activityLevel === 'moderate' ? 45 : 60
  const waterGoalMl = Math.min(4000, Math.max(2000, Math.round((profile.weightKg * 35) / 250) * 250))
  return {
    caloriesGoal: Math.max(1400, Math.round((tdee + meta.calorieAdjust) / 10) * 10),
    stepsGoal,
    waterGoalMl,
    weeklyWorkouts,
    dailyMinutes,
  }
}

/** MET based energy expenditure: kcal = MET × 3.5 × kg / 200 × minutes */
export const caloriesFromMET = (met: number, weightKg: number, minutes: number) =>
  Math.round((met * 3.5 * weightKg * minutes) / 200)

export const avgMET = (mets: number[], fallback = 6) => (mets.length ? sum(mets) / mets.length : fallback)

/* ------------------------------ streaks ------------------------------ */

export interface StreakInfo {
  current: number
  longest: number
  activeDates: string[]
  todayActive: boolean
}

/**
 * A day counts as "active" when a workout was completed or the step goal
 * was reached. The current streak may still be "alive" if yesterday was
 * active — today simply hasn't happened yet.
 */
export const computeStreak = (activeDates: Iterable<string>): StreakInfo => {
  const set = new Set(activeDates)
  const sorted = [...set].sort()
  if (!sorted.length) return { current: 0, longest: 0, activeDates: sorted, todayActive: false }

  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(sorted[i - 1]).getTime()
    const cur = new Date(sorted[i]).getTime()
    const gap = Math.round((cur - prev) / 86400000)
    run = gap === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const today = todayKey()
  const yesterday = dateKey(new Date(Date.now() - 86400000))
  let current = 0
  if (set.has(today)) {
    current = 1
    let cursor = today
    while (set.has(dateKey(new Date(new Date(cursor).getTime() - 86400000)))) {
      cursor = dateKey(new Date(new Date(cursor).getTime() - 86400000))
      current += 1
    }
  } else if (set.has(yesterday)) {
    let cursor = yesterday
    current = 1
    while (set.has(dateKey(new Date(new Date(cursor).getTime() - 86400000)))) {
      cursor = dateKey(new Date(new Date(cursor).getTime() - 86400000))
      current += 1
    }
  }

  return { current, longest: Math.max(longest, current), activeDates: sorted, todayActive: set.has(today) }
}

/* --------------------------- aggregation --------------------------- */

export interface DaySummary {
  key: string
  caloriesBurned: number
  activeCalories: number
  caloriesConsumed: number
  steps: number
  waterMl: number
  workoutMinutes: number
  sessions: number
}

export const buildDaySummaries = (
  sessions: WorkoutSession[],
  meals: Meal[],
  water: WaterLog[],
  steps: StepLog[],
  days: string[],
): DaySummary[] =>
  days.map((key) => {
    const daySessions = sessions.filter((s) => s.date === key)
    const activeMinutes = round(sum(daySessions.map((s) => s.durationSec / 60)), 0)
    const activeCalories = round(sum(daySessions.map((s) => s.caloriesBurned)), 0)
    const daySteps = sum(steps.filter((s) => s.date === key).map((s) => s.steps))
    return {
      key,
      sessions: daySessions.length,
      workoutMinutes: activeMinutes,
      activeCalories,
      // resting burn is a share of the daily target, keeps the ring meaningful
      caloriesBurned: activeCalories,
      caloriesConsumed: round(sum(meals.filter((m) => m.date === key).map((m) => m.calories)), 0),
      steps: daySteps,
      waterMl: sum(water.filter((w) => w.date === key).map((w) => w.ml)),
    }
  })

export const caloriesForDay = (meals: Meal[], key: string) => round(sum(meals.filter((m) => m.date === key).map((m) => m.calories)), 0)

export const macrosForDay = (meals: Meal[], key: string) => {
  const dayMeals = meals.filter((m) => m.date === key)
  return {
    protein: round(sum(dayMeals.map((m) => m.protein)), 0),
    carbs: round(sum(dayMeals.map((m) => m.carbs)), 0),
    fat: round(sum(dayMeals.map((m) => m.fat)), 0),
  }
}

export const waterForDay = (water: WaterLog[], key: string) => sum(water.filter((w) => w.date === key).map((w) => w.ml))

export const stepsForDay = (steps: StepLog[], key: string) => sum(steps.filter((s) => s.date === key).map((s) => s.steps))

export const minutesForDay = (sessions: WorkoutSession[], key: string) =>
  round(sum(sessions.filter((s) => s.date === key).map((s) => s.durationSec / 60)), 0)

export const latestBodyEntry = (entries: BodyEntry[]) =>
  [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null

export const weightChange = (entries: BodyEntry[], days: number) => {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1))
  if (sorted.length < 2) return 0
  const cutoff = lastNDays(days)[0]
  const inRange = sorted.filter((e) => e.date >= cutoff)
  const first = inRange[0] ?? sorted[0]
  const last = inRange[inRange.length - 1]
  return round(last.weightKg - first.weightKg, 1)
}

export const bodyFatSeries = (entries: BodyEntry[]) => entries.filter((e) => typeof e.bodyFat === 'number').map((e) => ({ date: e.date, value: e.bodyFat as number }))

/* ------------------------------- goals ------------------------------- */

export const goalMetricValue = (goal: Goal, ctx: { weightKg: number; sessions: WorkoutSession[]; steps: StepLog[]; water: WaterLog[]; meals: Meal[] }) => {
  switch (goal.metric) {
    case 'weight':
      return ctx.weightKg
    case 'workouts':
      return ctx.sessions.filter((s) => weekKeys().includes(s.date)).length
    case 'steps':
      return stepsForDay(ctx.steps, todayKey())
    case 'water':
      return waterForDay(ctx.water, todayKey())
    case 'calories':
      return caloriesForDay(ctx.meals, todayKey())
    default:
      return goal.current
  }
}

export const goalPercent = (goal: Goal) => {
  const span = Math.abs(goal.target - goal.start)
  if (span === 0) return goal.current === goal.target ? 100 : 0
  const moved = Math.abs(goal.current - goal.start)
  return round(percent(moved, span), 0)
}

export const goalDaysLeft = (goal: Goal) => {
  const diff = Math.round((new Date(goal.deadline).getTime() - new Date(todayKey()).getTime()) / 86400000)
  return Math.max(0, diff)
}

/* --------------------------- achievements --------------------------- */

export interface AchievementStats {
  sessions: number
  streak: number
  steps: number
  water: number
  calories: number
  goals: number
  minutes: number
  firstWorkoutAt: string | null
}

export const buildAchievementStats = (data: {
  sessions: WorkoutSession[]
  steps: StepLog[]
  water: WaterLog[]
  goals: Goal[]
  streak: number
}): AchievementStats => ({
  sessions: data.sessions.length,
  streak: data.streak,
  steps: round(sum(data.steps.map((s) => s.steps)), 0),
  water: round(sum(data.water.map((w) => w.ml)) / 1000, 1),
  calories: round(sum(data.sessions.map((s) => s.caloriesBurned)), 0),
  goals: data.goals.filter((g) => g.status === 'completed').length,
  minutes: round(sum(data.sessions.map((s) => s.durationSec / 60)), 0),
  firstWorkoutAt: data.sessions.length ? [...data.sessions].sort((a, b) => (a.date < b.date ? -1 : 1))[0].date : null,
})

export const achievementValue = (achievement: Achievement, stats: AchievementStats): number => {
  switch (achievement.metric) {
    case 'sessions':
      return stats.sessions
    case 'streak':
      return stats.streak
    case 'steps':
      return stats.steps
    case 'water':
      return stats.water
    case 'calories':
      return stats.calories
    case 'goals':
      return stats.goals
    case 'minutes':
      return stats.minutes
    case 'weight':
      return 0
    default:
      return 0
  }
}

export const evaluateAchievements = (achievements: Achievement[], stats: AchievementStats, unlocked: string[]) =>
  achievements
    .filter((a) => !unlocked.includes(a.id))
    .filter((a) => achievementValue(a, stats) >= a.threshold)
    .map((a) => a.id)

/* --------------------------- session maths --------------------------- */

export const sessionCompletion = (exercises: SessionExercise[]) => {
  const total = sum(exercises.map((e) => e.sets.length))
  const done = sum(exercises.map((e) => e.sets.filter((s) => s.done).length))
  return { total, done, ratio: total ? round((done / total) * 100, 0) : 0 }
}

export const sessionCalories = (met: number, weightKg: number, durationSec: number) =>
  caloriesFromMET(met, weightKg, durationSec / 60)

export const recoveryEstimate = (session: WorkoutSession) => {
  const intensity = session.completion / 100
  return round(Math.min(48, 12 + session.durationSec / 60 / 3 + intensity * 8), 0)
}
