/* ------------------------------------------------------------------
   Seed / factory helpers. Everything a brand-new user needs, plus an
   optional demo history so charts, streaks and achievements have data
   from the very first render.
------------------------------------------------------------------ */
import { ACHIEVEMENTS } from './achievements'
import { buildAchievementStats, calcTargets, caloriesFromMET, computeStreak, evaluateAchievements, estimateBodyFat, calcBMI } from './fitness'
import { getExercise } from './exercises'
import { getWorkout, WORKOUTS } from './workouts'
import type {
  AppNotification,
  BodyEntry,
  Goal,
  Meal,
  MealType,
  SessionExercise,
  StepLog,
  UnlockedAchievement,
  User,
  UserData,
  UserProfile,
  UserSettings,
  WaterLog,
  WorkoutSession,
} from './types'
import { dateKey, lastNDays, round, sum, todayKey, uid } from './utils'

export const DEMO_CREDENTIALS = { email: 'alex@pulse.fit', password: 'pulse1234' }

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  units: 'metric',
  notifications: { workout: true, water: true, goals: true, streak: true, weekly: true },
  privacy: { shareActivity: false, publicProfile: true, analytics: true },
}

export const AVATAR_COLORS = ['#10B981', '#38BDF8', '#A855F7', '#F97316', '#F43F5E', '#F5B301']

/** deterministic PRNG so a seeded account always looks the same */
const mulberry32 = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const makeProfile = (partial: Partial<UserProfile> = {}): UserProfile => {
  const base: UserProfile = {
    age: 28,
    gender: 'male',
    heightCm: 178,
    weightKg: 76,
    goal: 'lose-weight',
    activityLevel: 'moderate',
    experience: 'intermediate',
    place: 'gym',
    onboarded: false,
    targets: { caloriesGoal: 2200, stepsGoal: 10000, waterGoalMl: 2650, weeklyWorkouts: 5, dailyMinutes: 45 },
    ...partial,
  }
  base.targets = { ...base.targets, ...calcTargets(base) }
  return base
}

export const createUser = (input: {
  name: string
  email: string
  passwordHash: string
  provider?: User['provider']
  profile?: Partial<UserProfile>
  avatarColor?: string
}): User => ({
  id: uid('user'),
  name: input.name,
  email: input.email.toLowerCase(),
  passwordHash: input.passwordHash,
  provider: input.provider ?? 'email',
  avatarColor: input.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  createdAt: new Date().toISOString(),
  profile: makeProfile(input.profile),
  settings: { ...DEFAULT_SETTINGS },
})

export const emptyData = (): UserData => ({
  sessions: [],
  activeSession: null,
  water: [],
  meals: [],
  body: [],
  goals: [],
  notifications: [],
  steps: [],
  achievements: [],
  lastStepSync: null,
})

/* ------------------------------------------------------------------ */
/* demo history                                                        */
/* ------------------------------------------------------------------ */

const FOOD_POOL: { name: string; type: MealType; calories: number; protein: number; carbs: number; fat: number }[] = [
  { name: 'Greek Yogurt & Berries', type: 'breakfast', calories: 320, protein: 24, carbs: 38, fat: 8 },
  { name: 'Oatmeal with Banana', type: 'breakfast', calories: 410, protein: 15, carbs: 68, fat: 9 },
  { name: 'Scrambled Eggs & Toast', type: 'breakfast', calories: 480, protein: 28, carbs: 34, fat: 24 },
  { name: 'Protein Smoothie', type: 'breakfast', calories: 350, protein: 32, carbs: 44, fat: 6 },
  { name: 'Grilled Chicken & Rice', type: 'lunch', calories: 620, protein: 48, carbs: 66, fat: 14 },
  { name: 'Turkey Wrap & Salad', type: 'lunch', calories: 540, protein: 38, carbs: 52, fat: 18 },
  { name: 'Quinoa Power Bowl', type: 'lunch', calories: 580, protein: 26, carbs: 72, fat: 19 },
  { name: 'Salmon, Potatoes & Greens', type: 'dinner', calories: 690, protein: 45, carbs: 48, fat: 30 },
  { name: 'Steak & Roasted Veg', type: 'dinner', calories: 720, protein: 52, carbs: 32, fat: 38 },
  { name: 'Chicken Stir Fry', type: 'dinner', calories: 610, protein: 44, carbs: 58, fat: 20 },
  { name: 'Cottage Cheese Bowl', type: 'snack', calories: 210, protein: 22, carbs: 12, fat: 8 },
  { name: 'Almonds & Apple', type: 'snack', calories: 240, protein: 6, carbs: 28, fat: 13 },
  { name: 'Protein Bar', type: 'snack', calories: 220, protein: 20, carbs: 24, fat: 7 },
  { name: 'Rice Cakes & Peanut Butter', type: 'snack', calories: 280, protein: 10, carbs: 30, fat: 14 },
]

const REST_DAYS_PER_WEEK = (profile: UserProfile) => {
  const perWeek = profile.targets.weeklyWorkouts
  return Math.max(1, 7 - perWeek)
}

export const seedHistory = (profile: UserProfile, days = 84): UserData => {
  const rand = mulberry32(profile.weightKg * 97 + profile.age * 13 + days)
  const data = emptyData()
  const keys = lastNDays(days)
  const restCount = REST_DAYS_PER_WEEK(profile)
  const stepBase =
    profile.activityLevel === 'sedentary' ? 5200 : profile.activityLevel === 'light' ? 7400 : profile.activityLevel === 'moderate' ? 9600 : 11800

  const pool = WORKOUTS.filter((w) => w.place.includes(profile.place))
  const ordered = pool.length ? pool : WORKOUTS

  const weightStart = profile.goal === 'build-muscle' ? profile.weightKg - 2.4 : profile.weightKg + 3.6
  const direction = profile.goal === 'build-muscle' ? -1 : 1
  const totalShift = direction * (2.8 + rand() * 1.4)

  let sessionIndex = 0

  keys.forEach((key, dayIdx) => {
    // skip a couple of rest days each week, never the last three days
    const dow = new Date(key).getDay()
    const isRestCandidate = dow === 0 || dow === 3 || dow === 6
    const recent = dayIdx >= days - 3
    const restDay = !recent && isRestCandidate && dayIdx % Math.max(2, Math.round(7 / Math.max(1, restCount))) === 0

    const steps = Math.round(stepBase * (0.68 + rand() * 0.62) + (restDay ? 0 : 900))
    data.steps.push({ id: uid('step'), date: key, steps })

    // hydration: 3–6 logs a day
    const logs = 3 + Math.floor(rand() * 4)
    for (let i = 0; i < logs; i += 1) {
      data.water.push({
        id: uid('water'),
        date: key,
        ml: [250, 250, 350, 500, 500, 750][Math.floor(rand() * 6)],
        at: `${key}T${`${8 + i * 2}`.padStart(2, '0')}:${`${Math.floor(rand() * 59)}`.padStart(2, '0')}:00`,
      })
    }

    // meals: 3–4 a day
    const mealTypes: MealType[] = rand() > 0.4 ? ['breakfast', 'lunch', 'dinner', 'snack'] : ['breakfast', 'lunch', 'dinner']
    mealTypes.forEach((type) => {
      const options = FOOD_POOL.filter((f) => f.type === type)
      const food = options[Math.floor(rand() * options.length)]
      data.meals.push({
        id: uid('meal'),
        date: key,
        type,
        name: food.name,
        calories: Math.round(food.calories * (0.9 + rand() * 0.2)),
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        at: `${key}T${`${type === 'breakfast' ? 8 : type === 'lunch' ? 13 : type === 'dinner' ? 20 : 16}`.padStart(2, '0')}:15:00`,
      })
    })

    if (!restDay) {
      const workout = ordered[(sessionIndex + Math.floor(rand() * 2)) % ordered.length]
      sessionIndex += 1
      const weightAtDay = weightStart + (totalShift * dayIdx) / days + (rand() - 0.5) * 0.4
      const durationMin = Math.max(12, Math.round(workout.durationMin * (0.85 + rand() * 0.3)))
      const exercises: SessionExercise[] = workout.exercises.map((row) => ({
        exerciseId: row.exerciseId,
        restSec: row.restSec,
        sets: Array.from({ length: row.sets }, () => ({
          reps: row.reps,
          done: rand() > 0.06,
        })),
      }))
      const completed = exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.done).length, 0)
      const planned = exercises.reduce((acc, e) => acc + e.sets.length, 0)
      const mets = workout.exercises.map((row) => getExercise(row.exerciseId).met)
      const avg = mets.reduce((a, b) => a + b, 0) / Math.max(1, mets.length)
      const startedHour = 6 + Math.floor(rand() * 12)
      const start = `${key}T${`${startedHour}`.padStart(2, '0')}:05:00`
      data.sessions.push({
        id: uid('session'),
        workoutId: workout.id,
        title: workout.title,
        category: workout.category,
        cover: workout.cover,
        date: key,
        startedAt: start,
        finishedAt: new Date(new Date(start).getTime() + durationMin * 60000).toISOString(),
        durationSec: durationMin * 60,
        caloriesBurned: caloriesFromMET(avg, weightAtDay, durationMin),
        totalSets: planned,
        completedSets: completed,
        completion: Math.round((completed / planned) * 100),
        exercises,
      })
    }

    // body measurements every 5th day
    if (dayIdx % 5 === 0 || dayIdx === days - 1) {
      const weightKg = round(weightStart + (totalShift * dayIdx) / days + (rand() - 0.5) * 0.5, 1)
      const bmi = calcBMI(weightKg, profile.heightCm)
      const waist = round(84 - (direction * 2.8 * dayIdx) / days + (rand() - 0.5), 1)
      data.body.push({
        id: uid('body'),
        date: key,
        weightKg,
        bodyFat: estimateBodyFat(bmi, profile.age, profile.gender),
        measurements: {
          chest: round(100 - (direction * 1.2 * dayIdx) / days + (rand() - 0.5), 1),
          waist,
          hips: round(96 - (direction * 1.6 * dayIdx) / days + (rand() - 0.5), 1),
          arms: round(34 + (direction === -1 ? 0.8 : 0.4) * (dayIdx / days) + (rand() - 0.5) * 0.3, 1),
          thighs: round(58 - (direction * 1.4 * dayIdx) / days + (rand() - 0.5), 1),
        },
        at: `${key}T07:15:00`,
      })
    }
  })

  // today is only partially complete
  const hour = new Date().getHours()
  const todaySteps = data.steps.find((s) => s.date === todayKey())
  if (todaySteps) {
    todaySteps.steps = Math.round((stepBase * Math.min(1, hour / 20)) * (0.85 + rand() * 0.3))
  }
  data.water = data.water.filter((w) => w.date !== todayKey() || new Date(w.at).getHours() <= hour)
  data.meals = data.meals.filter((m) => m.date !== todayKey() || new Date(m.at).getHours() <= hour)

  const weightNow = round(weightStart + totalShift, 1)
  profile.weightKg = weightNow

  data.goals = buildSeedGoals(profile, weightNow)
  data.lastStepSync = new Date().toISOString()
  data.notifications = buildWelcomeNotifications(profile)

  const stats = buildAchievementStats({
    sessions: data.sessions,
    steps: data.steps,
    water: data.water,
    goals: data.goals,
    streak: computeStreak(activeDatesFrom(data, profile.targets.stepsGoal)).current,
  })
  data.achievements = evaluateAchievements(ACHIEVEMENTS, stats, []).map<UnlockedAchievement>((id) => ({
    id,
    unlockedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }))

  return data
}

/** every day the user trained or hit their step goal */
export const activeDatesFrom = (data: UserData, stepsGoal: number) => {
  const keys = new Set(data.sessions.map((s) => s.date))
  data.steps.filter((s) => s.steps >= stepsGoal).forEach((s) => keys.add(s.date))
  return [...keys]
}

export const buildSeedGoals = (profile: UserProfile, weightNow: number): Goal[] => [
  {
    id: uid('goal'),
    title: profile.goal === 'build-muscle' ? 'Gain 3 kg lean mass' : 'Lose 5 kg',
    metric: 'weight',
    start: round(weightNow, 1),
    current: round(weightNow, 1),
    target: profile.goal === 'build-muscle' ? round(weightNow + 3, 1) : round(Math.max(50, weightNow - 5), 1),
    unit: 'kg',
    direction: profile.goal === 'build-muscle' ? 'increase' : 'decrease',
    deadline: dateKey(new Date(Date.now() + 86400000 * 90)),
    createdAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: uid('goal'),
    title: `Workout ${profile.targets.weeklyWorkouts} days a week`,
    metric: 'workouts',
    start: 0,
    current: 0,
    target: profile.targets.weeklyWorkouts,
    unit: 'sessions',
    direction: 'increase',
    deadline: dateKey(new Date(Date.now() + 86400000 * 7)),
    createdAt: new Date().toISOString(),
    status: 'active',
    perWeek: profile.targets.weeklyWorkouts,
  },
  {
    id: uid('goal'),
    title: `Walk ${profile.targets.stepsGoal.toLocaleString('en-US')} steps daily`,
    metric: 'steps',
    start: 0,
    current: 0,
    target: profile.targets.stepsGoal,
    unit: 'steps',
    direction: 'increase',
    deadline: dateKey(new Date(Date.now() + 86400000 * 30)),
    createdAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: uid('goal'),
    title: `Drink ${round(profile.targets.waterGoalMl / 1000, 1)}L water daily`,
    metric: 'water',
    start: 0,
    current: 0,
    target: profile.targets.waterGoalMl,
    unit: 'ml',
    direction: 'increase',
    deadline: dateKey(new Date(Date.now() + 86400000 * 30)),
    createdAt: new Date().toISOString(),
    status: 'active',
  },
]

export const buildWelcomeNotifications = (profile: UserProfile): AppNotification[] => {
  const now = Date.now()
  return [
    {
      id: uid('notif'),
      kind: 'workout',
      title: "💪 It's workout time!",
      body: `Your ${profile.targets.dailyMinutes} minute session is ready. Consistency beats intensity.`,
      at: new Date(now - 3600_000).toISOString(),
      read: false,
    },
    {
      id: uid('notif'),
      kind: 'water',
      title: '💧 Hydration check',
      body: 'You are 500ml away from your water goal. Grab a glass!',
      at: new Date(now - 5400_000).toISOString(),
      read: false,
    },
    {
      id: uid('notif'),
      kind: 'streak',
      title: '🔥 Streak alive',
      body: 'Keep the streak going — one workout today keeps it burning.',
      at: new Date(now - 86400_000).toISOString(),
      read: true,
    },
  ]
}

/** Convenience for the "Try demo account" flow. */
export const buildDemoUser = (passwordHash: string): User => {
  const user = createUser({
    name: 'Alex Carter',
    email: DEMO_CREDENTIALS.email,
    passwordHash,
    profile: {
      age: 29,
      gender: 'male',
      heightCm: 179,
      weightKg: 76.4,
      goal: 'lose-weight',
      activityLevel: 'moderate',
      experience: 'intermediate',
      place: 'gym',
      onboarded: true,
    },
  })
  return user
}

export const buildDemoData = (user: User): UserData => {
  const data = seedHistory(user.profile, 84)
  return { ...data, lastStepSync: new Date().toISOString() }
}

export const totalVolume = (sessions: WorkoutSession[]) => round(sum(sessions.map((s) => s.durationSec / 60)), 0)

export const workoutTitle = (id: string) => getWorkout(id)?.title ?? 'Workout'

export const BODY_FIELDS: { key: keyof BodyEntry['measurements']; label: string }[] = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'arms', label: 'Arms' },
  { key: 'thighs', label: 'Thighs' },
]

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export const emptyMeal = (type: MealType, date = todayKey()): Meal => ({
  id: uid('meal'),
  date,
  type,
  name: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  at: new Date().toISOString(),
})

export const emptyStepLog = (date = todayKey()): StepLog => ({ id: uid('step'), date, steps: 0 })

export const emptyWaterLog = (ml: number): WaterLog => ({
  id: uid('water'),
  date: todayKey(),
  ml,
  at: new Date().toISOString(),
})
