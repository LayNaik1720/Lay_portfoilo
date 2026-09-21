/* ------------------------------------------------------------------
   Domain types — single source of truth for the whole application
------------------------------------------------------------------ */

export type Gender = 'male' | 'female' | 'other'

export type FitnessGoal =
  | 'lose-weight'
  | 'build-muscle'
  | 'maintain-weight'
  | 'improve-fitness'
  | 'increase-strength'
  | 'improve-endurance'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type WorkoutPlace = 'gym' | 'home' | 'outdoor'
export type ThemeMode = 'dark' | 'light' | 'system'
export type Units = 'metric' | 'imperial'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type GoalStatus = 'active' | 'completed' | 'archived'

export interface UserSettings {
  theme: ThemeMode
  units: Units
  notifications: {
    workout: boolean
    water: boolean
    goals: boolean
    streak: boolean
    weekly: boolean
  }
  privacy: {
    shareActivity: boolean
    publicProfile: boolean
    analytics: boolean
  }
}

export interface UserProfile {
  age: number
  gender: Gender
  heightCm: number
  weightKg: number
  goal: FitnessGoal
  activityLevel: ActivityLevel
  experience: Experience
  place: WorkoutPlace
  onboarded: boolean
  /** auto-generated targets, recalculated whenever body stats change */
  targets: {
    caloriesGoal: number
    stepsGoal: number
    waterGoalMl: number
    weeklyWorkouts: number
    dailyMinutes: number
  }
}

export interface User {
  id: string
  name: string
  email: string
  /** demo-only hash, never a real credential store */
  passwordHash: string
  provider: 'email' | 'google'
  avatarColor: string
  avatarUrl?: string
  createdAt: string
  profile: UserProfile
  settings: UserSettings
}

export interface UserData {
  sessions: WorkoutSession[]
  activeSession: ActiveSession | null
  water: WaterLog[]
  meals: Meal[]
  body: BodyEntry[]
  goals: Goal[]
  notifications: AppNotification[]
  steps: StepLog[]
  achievements: UnlockedAchievement[]
  lastStepSync: string | null
}

/* ----------------------------- workouts ----------------------------- */

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Arms'
  | 'Core'
  | 'Shoulders'
  | 'Glutes'
  | 'Full Body'
  | 'Mobility'

export type WorkoutCategory =
  | 'Strength'
  | 'Cardio'
  | 'HIIT'
  | 'Yoga'
  | 'Mobility'
  | 'Full Body'
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Arms'
  | 'Core'

export type Equipment = 'None' | 'Dumbbells' | 'Barbell' | 'Kettlebell' | 'Resistance Band' | 'Mat' | 'Machine' | 'Pull-up Bar'

export interface Exercise {
  id: string
  name: string
  group: MuscleGroup
  equipment: Equipment
  /** stylised figure archetype used for the exercise visual */
  pose: PoseKey
  met: number
  instructions: string[]
  tip: string
}

export interface WorkoutExercise {
  exerciseId: string
  sets: number
  reps: number
  restSec: number
  /** how to read `reps` — repetitions or a timed hold in seconds */
  unit?: 'reps' | 'sec'
}

export interface Workout {
  id: string
  title: string
  category: WorkoutCategory
  difficulty: Difficulty
  durationMin: number
  calories: number
  cover: string
  description: string
  intensity: 'Low' | 'Moderate' | 'High'
  equipment: Equipment[]
  place: WorkoutPlace[]
  focus: MuscleGroup[]
  exercises: WorkoutExercise[]
}

/* ----------------------------- tracking ----------------------------- */

export interface SetProgress {
  reps: number
  done: boolean
}

export interface SessionExercise {
  exerciseId: string
  sets: SetProgress[]
  restSec: number
  unit?: 'reps' | 'sec'
}

export interface WorkoutSession {
  id: string
  workoutId: string
  title: string
  category: WorkoutCategory
  cover: string
  /** YYYY-MM-DD */
  date: string
  startedAt: string
  finishedAt: string
  durationSec: number
  caloriesBurned: number
  totalSets: number
  completedSets: number
  completion: number
  exercises: SessionExercise[]
  note?: string
  feeling?: 1 | 2 | 3 | 4 | 5
}

export interface ActiveSession {
  workoutId: string
  title: string
  cover: string
  startedAt: string
  elapsedBeforePause: number
  index: number
  paused: boolean
  exercises: SessionExercise[]
  caloriesPerMin: number
}

export interface WaterLog {
  id: string
  date: string
  ml: number
  at: string
}

export interface Meal {
  id: string
  date: string
  type: MealType
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  at: string
}

export interface Measurements {
  chest?: number
  waist?: number
  hips?: number
  arms?: number
  thighs?: number
}

export interface BodyEntry {
  id: string
  date: string
  weightKg: number
  bodyFat?: number
  measurements: Measurements
  at: string
}

export type GoalMetric = 'weight' | 'workouts' | 'steps' | 'water' | 'calories' | 'custom'

export interface Goal {
  id: string
  title: string
  metric: GoalMetric
  start: number
  current: number
  target: number
  unit: string
  direction: 'increase' | 'decrease'
  deadline: string
  createdAt: string
  status: GoalStatus
  /** for repeating goals such as "workout 5 days / week" */
  perWeek?: number
}

export interface StepLog {
  id: string
  date: string
  steps: number
}

export type NotificationKind = 'workout' | 'water' | 'goal' | 'streak' | 'report' | 'achievement'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  at: string
  read: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  metric: 'sessions' | 'streak' | 'steps' | 'water' | 'calories' | 'goals' | 'weight' | 'minutes'
  threshold: number
}

export interface UnlockedAchievement {
  id: string
  unlockedAt: string
}

export type PoseKey =
  | 'pushup'
  | 'squat'
  | 'lunge'
  | 'plank'
  | 'climber'
  | 'jump'
  | 'curl'
  | 'press'
  | 'run'
  | 'bridge'
  | 'twist'
  | 'stretch'
  | 'row'
  | 'swing'
  | 'pullup'
  | 'jumpjack'
