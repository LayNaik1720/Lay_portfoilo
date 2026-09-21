/* ------------------------------------------------------------------
   Workout catalogue. Each workout stores a plan of exercises with
   sets / reps / rest; calorie burn is personalised at render time.
------------------------------------------------------------------ */
import { getExercise } from './exercises'
import { avgMET, caloriesFromMET } from './fitness'
import type {
  Difficulty,
  Equipment,
  Experience,
  MuscleGroup,
  Workout,
  WorkoutCategory,
  WorkoutExercise,
  WorkoutPlace,
} from './types'

type PlanRow = [exerciseId: string, sets: number, reps: number, restSec: number, unit?: 'reps' | 'sec']

interface WorkoutSeed {
  id: string
  title: string
  category: WorkoutCategory
  difficulty: Difficulty
  durationMin: number
  calories: number
  cover: string
  description: string
  intensity: Workout['intensity']
  place: WorkoutPlace[]
  plan: PlanRow[]
}

const COVERS = {
  strength: '/img/cover-strength.jpg',
  cardio: '/img/cover-cardio.jpg',
  hiit: '/img/cover-hiit.jpg',
  yoga: '/img/cover-yoga.jpg',
  mobility: '/img/cover-mobility.jpg',
  fullbody: '/img/cover-fullbody.jpg',
  chest: '/img/cover-chest.jpg',
  back: '/img/cover-back.jpg',
  legs: '/img/cover-legs.jpg',
  arms: '/img/cover-arms.jpg',
  core: '/img/cover-fullbody.jpg',
} as const

const plan = (rows: PlanRow[]): WorkoutExercise[] =>
  rows.map(([exerciseId, sets, reps, restSec, unit]) => ({ exerciseId, sets, reps, restSec, unit: unit ?? 'reps' }))

const seed: WorkoutSeed[] = [
  {
    id: 'full-body-strength',
    title: 'Full Body Strength',
    category: 'Full Body',
    difficulty: 'Intermediate',
    durationMin: 45,
    calories: 320,
    cover: COVERS.fullbody,
    description: 'Six compound lifts that load every major muscle group. The classic session when you want maximum return per minute.',
    intensity: 'Moderate',
    place: ['gym', 'home'],
    plan: [
      ['bodyweight-squat', 4, 12, 45],
      ['push-up', 4, 12, 45],
      ['bent-over-row', 3, 12, 60],
      ['walking-lunge', 3, 12, 45],
      ['plank', 3, 45, 45, 'sec'],
      ['mountain-climber', 3, 30, 45, 'sec'],
    ],
  },
  {
    id: 'total-body-burn',
    title: 'Total Body Burn',
    category: 'Full Body',
    difficulty: 'Beginner',
    durationMin: 30,
    calories: 240,
    cover: COVERS.fullbody,
    description: 'A gentle full-body circuit to build the habit. No equipment, no jumping, all progress.',
    intensity: 'Low',
    place: ['home', 'outdoor'],
    plan: [
      ['bodyweight-squat', 3, 12, 40],
      ['incline-push-up', 3, 10, 40],
      ['glute-bridge', 3, 15, 40],
      ['dead-bug', 3, 10, 30],
      ['superman', 3, 30, 30, 'sec'],
    ],
  },
  {
    id: 'power-hour',
    title: 'Power Hour',
    category: 'Full Body',
    difficulty: 'Advanced',
    durationMin: 55,
    calories: 480,
    cover: COVERS.fullbody,
    description: 'Heavy compound work plus a metabolic finisher. Bring chalk and a lot of intent.',
    intensity: 'High',
    place: ['gym'],
    plan: [
      ['barbell-back-squat', 5, 5, 120],
      ['dumbbell-bench-press', 4, 8, 90],
      ['romanian-deadlift', 4, 8, 120],
      ['pull-up', 4, 8, 90],
      ['thruster', 3, 12, 60],
      ['burpee', 3, 15, 60],
    ],
  },
  {
    id: 'morning-ignition',
    title: 'Morning Ignition',
    category: 'HIIT',
    difficulty: 'Beginner',
    durationMin: 20,
    calories: 210,
    cover: COVERS.hiit,
    description: 'Twenty minutes to wake the whole body up. Three rounds, short rests, big energy.',
    intensity: 'Moderate',
    place: ['home', 'outdoor'],
    plan: [
      ['jumping-jacks', 3, 40, 20, 'sec'],
      ['bodyweight-squat', 3, 15, 20],
      ['high-knees', 3, 30, 30, 'sec'],
      ['mountain-climber', 3, 30, 30, 'sec'],
    ],
  },
  {
    id: 'tabata-inferno',
    title: 'Tabata Inferno',
    category: 'HIIT',
    difficulty: 'Advanced',
    durationMin: 25,
    calories: 330,
    cover: COVERS.hiit,
    description: 'Classic 20/10 Tabata blocks across four movements. Short, brutal, extremely effective.',
    intensity: 'High',
    place: ['home', 'gym'],
    plan: [
      ['burpee', 4, 20, 10, 'sec'],
      ['jump-rope', 4, 20, 10, 'sec'],
      ['box-jump', 4, 20, 10, 'sec'],
      ['high-knees', 4, 20, 10, 'sec'],
    ],
  },
  {
    id: 'emom-engine',
    title: 'EMOM Engine',
    category: 'HIIT',
    difficulty: 'Intermediate',
    durationMin: 30,
    calories: 360,
    cover: COVERS.hiit,
    description: 'Every minute on the minute you complete a block, then rest whatever is left. Pacing is everything.',
    intensity: 'High',
    place: ['gym', 'home'],
    plan: [
      ['kb-swing', 5, 15, 30],
      ['dumbbell-snatch', 5, 10, 30],
      ['bear-crawl', 4, 30, 30, 'sec'],
      ['jumping-jacks', 4, 40, 20, 'sec'],
    ],
  },
  {
    id: 'fat-burn-run',
    title: 'Fat Burn Run',
    category: 'Cardio',
    difficulty: 'Beginner',
    durationMin: 30,
    calories: 290,
    cover: COVERS.cardio,
    description: 'Easy aerobic base work with walking breaks. Builds the engine without frying the legs.',
    intensity: 'Low',
    place: ['outdoor'],
    plan: [
      ['steady-run', 3, 5, 60, 'sec'],
      ['incline-walk', 2, 5, 60, 'sec'],
      ['high-knees', 3, 40, 40, 'sec'],
      ['hamstring-stretch', 2, 40, 20, 'sec'],
    ],
  },
  {
    id: 'interval-sprints',
    title: 'Interval Sprints',
    category: 'Cardio',
    difficulty: 'Advanced',
    durationMin: 25,
    calories: 340,
    cover: COVERS.cardio,
    description: 'Short maximal efforts with full recovery. The fastest way to raise VO2 max.',
    intensity: 'High',
    place: ['outdoor', 'gym'],
    plan: [
      ['sprint-interval', 8, 30, 90, 'sec'],
      ['stair-climb', 3, 60, 60, 'sec'],
      ['calf-raise', 3, 20, 30],
      ['hip-flexor-stretch', 2, 40, 20, 'sec'],
    ],
  },
  {
    id: 'endurance-base',
    title: 'Endurance Base',
    category: 'Cardio',
    difficulty: 'Intermediate',
    durationMin: 50,
    calories: 470,
    cover: COVERS.cardio,
    description: 'Long steady effort to build mitochondria and patience. Zone 2 the whole way.',
    intensity: 'Moderate',
    place: ['outdoor', 'gym'],
    plan: [
      ['rowing-machine', 2, 10, 60, 'sec'],
      ['steady-run', 2, 12, 60, 'sec'],
      ['stair-climb', 2, 5, 60, 'sec'],
      ['cobra', 2, 40, 20, 'sec'],
    ],
  },
  {
    id: 'chest-builder',
    title: 'Chest Builder',
    category: 'Chest',
    difficulty: 'Intermediate',
    durationMin: 40,
    calories: 280,
    cover: COVERS.chest,
    description: 'Press, press, fly, press. Balanced volume for thickness and a strong upper chest.',
    intensity: 'Moderate',
    place: ['gym'],
    plan: [
      ['dumbbell-bench-press', 4, 10, 75],
      ['incline-dumbbell-press', 3, 10, 75],
      ['push-up', 3, 15, 45],
      ['dumbbell-fly', 3, 12, 60],
      ['tricep-dip', 3, 12, 45],
    ],
  },
  {
    id: 'push-power',
    title: 'Push Power',
    category: 'Chest',
    difficulty: 'Beginner',
    durationMin: 25,
    calories: 170,
    cover: COVERS.chest,
    description: 'Bodyweight pushing strength you can do anywhere — zero equipment required.',
    intensity: 'Moderate',
    place: ['home', 'outdoor'],
    plan: [
      ['incline-push-up', 3, 12, 45],
      ['push-up', 3, 10, 45],
      ['pike-push-up', 3, 8, 45],
      ['tricep-dip', 3, 10, 45],
      ['plank', 3, 40, 30, 'sec'],
    ],
  },
  {
    id: 'back-architect',
    title: 'Back Architect',
    category: 'Back',
    difficulty: 'Intermediate',
    durationMin: 40,
    calories: 300,
    cover: COVERS.back,
    description: 'Vertical and horizontal pulling to build width and posture you can see in a t-shirt.',
    intensity: 'Moderate',
    place: ['gym'],
    plan: [
      ['pull-up', 4, 6, 90],
      ['lat-pulldown', 3, 12, 75],
      ['bent-over-row', 4, 10, 75],
      ['renegade-row', 3, 10, 60],
      ['superman', 3, 30, 30, 'sec'],
    ],
  },
  {
    id: 'pull-strength',
    title: 'Pull Strength',
    category: 'Back',
    difficulty: 'Advanced',
    durationMin: 45,
    calories: 380,
    cover: COVERS.back,
    description: 'Heavy rowing and weighted pulling for a dense, powerful back.',
    intensity: 'High',
    place: ['gym'],
    plan: [
      ['pull-up', 5, 5, 120],
      ['bent-over-row', 5, 6, 120],
      ['renegade-row', 4, 8, 75],
      ['farmer-carry', 3, 40, 60, 'sec'],
      ['reverse-snow-angel', 3, 15, 40],
    ],
  },
  {
    id: 'leg-day-foundations',
    title: 'Leg Day Foundations',
    category: 'Legs',
    difficulty: 'Beginner',
    durationMin: 35,
    calories: 250,
    cover: COVERS.legs,
    description: 'Squat, hinge, lunge — the three patterns that build strong, useful legs.',
    intensity: 'Moderate',
    place: ['gym', 'home'],
    plan: [
      ['bodyweight-squat', 3, 15, 60],
      ['glute-bridge', 3, 15, 45],
      ['step-up', 3, 10, 45],
      ['walking-lunge', 3, 12, 45],
      ['calf-raise', 3, 20, 30],
    ],
  },
  {
    id: 'leg-day-crusher',
    title: 'Leg Day Crusher',
    category: 'Legs',
    difficulty: 'Advanced',
    durationMin: 50,
    calories: 430,
    cover: COVERS.legs,
    description: 'High-volume squatting plus a hinge and a unilateral finisher. Walk-out optional.',
    intensity: 'High',
    place: ['gym'],
    plan: [
      ['barbell-back-squat', 5, 6, 150],
      ['romanian-deadlift', 4, 8, 120],
      ['bulgarian-split-squat', 4, 10, 75],
      ['leg-press', 3, 12, 90],
      ['calf-raise', 4, 20, 45],
    ],
  },
  {
    id: 'glute-focus',
    title: 'Glute Focus',
    category: 'Legs',
    difficulty: 'Intermediate',
    durationMin: 30,
    calories: 220,
    cover: COVERS.legs,
    description: 'Activation, load and burn for the posterior chain — with an emphasis on the squeeze.',
    intensity: 'Moderate',
    place: ['gym', 'home'],
    plan: [
      ['lateral-band-walk', 3, 15, 40],
      ['hip-thrust', 4, 12, 75],
      ['bulgarian-split-squat', 3, 10, 60],
      ['donkey-kick', 3, 15, 40],
      ['glute-bridge', 3, 20, 40],
    ],
  },
  {
    id: 'arm-sculpt',
    title: 'Arm Sculpt',
    category: 'Arms',
    difficulty: 'Beginner',
    durationMin: 25,
    calories: 180,
    cover: COVERS.arms,
    description: 'A quick biceps and triceps pump session — ideal as an add-on after a bigger lift.',
    intensity: 'Low',
    place: ['home', 'gym'],
    plan: [
      ['bicep-curl', 3, 12, 45],
      ['hammer-curl', 3, 12, 45],
      ['tricep-dip', 3, 12, 45],
      ['overhead-tricep-extension', 3, 12, 45],
    ],
  },
  {
    id: 'arms-blitz',
    title: 'Biceps & Triceps Blitz',
    category: 'Arms',
    difficulty: 'Intermediate',
    durationMin: 30,
    calories: 250,
    cover: COVERS.arms,
    description: 'Supersets that alternate curl and extension patterns for maximum pump per minute.',
    intensity: 'Moderate',
    place: ['gym'],
    plan: [
      ['bicep-curl', 4, 10, 45],
      ['tricep-kickback', 4, 12, 45],
      ['hammer-curl', 3, 12, 45],
      ['overhead-tricep-extension', 3, 12, 45],
      ['plank', 3, 40, 30, 'sec'],
    ],
  },
  {
    id: 'core-crusher',
    title: 'Core Crusher',
    category: 'Core',
    difficulty: 'Intermediate',
    durationMin: 20,
    calories: 160,
    cover: COVERS.core,
    description: 'Anti-extension and rotation work for a core that actually transfers to your lifts.',
    intensity: 'Moderate',
    place: ['home', 'gym'],
    plan: [
      ['plank', 3, 45, 30, 'sec'],
      ['bicycle-crunch', 3, 20, 30],
      ['leg-raise', 3, 12, 40],
      ['russian-twist', 3, 20, 30],
      ['hollow-hold', 3, 30, 30, 'sec'],
    ],
  },
  {
    id: 'abs-express',
    title: 'Abs Express',
    category: 'Core',
    difficulty: 'Beginner',
    durationMin: 15,
    calories: 110,
    cover: COVERS.core,
    description: 'Fifteen focused minutes when you are short on time but still want the streak.',
    intensity: 'Low',
    place: ['home', 'outdoor'],
    plan: [
      ['crunch', 3, 15, 30],
      ['dead-bug', 3, 10, 30],
      ['side-plank', 3, 30, 30, 'sec'],
      ['plank', 3, 30, 30, 'sec'],
    ],
  },
  {
    id: 'strength-foundations',
    title: 'Strength Foundations',
    category: 'Strength',
    difficulty: 'Beginner',
    durationMin: 40,
    calories: 260,
    cover: COVERS.strength,
    description: 'Learn the five big patterns with light loads and perfect technique. Your future self says thanks.',
    intensity: 'Moderate',
    place: ['gym', 'home'],
    plan: [
      ['goblet-squat', 3, 10, 75],
      ['dumbbell-bench-press', 3, 10, 75],
      ['bent-over-row', 3, 10, 75],
      ['glute-bridge', 3, 12, 45],
      ['plank', 3, 40, 30, 'sec'],
    ],
  },
  {
    id: 'heavy-lift-day',
    title: 'Heavy Lift Day',
    category: 'Strength',
    difficulty: 'Advanced',
    durationMin: 60,
    calories: 420,
    cover: COVERS.strength,
    description: 'Low reps, long rests, a barbell and a stopwatch. Pure strength focus.',
    intensity: 'High',
    place: ['gym'],
    plan: [
      ['barbell-back-squat', 5, 5, 180],
      ['dumbbell-bench-press', 5, 5, 150],
      ['romanian-deadlift', 4, 6, 150],
      ['pull-up', 4, 6, 120],
      ['farmer-carry', 3, 45, 90, 'sec'],
    ],
  },
  {
    id: 'hypertrophy-upper',
    title: 'Dumbbell Hypertrophy',
    category: 'Strength',
    difficulty: 'Intermediate',
    durationMin: 45,
    calories: 340,
    cover: COVERS.strength,
    description: 'Moderate loads, higher reps, shorter rests — the classic hypertrophy recipe for the upper body.',
    intensity: 'Moderate',
    place: ['gym', 'home'],
    plan: [
      ['dumbbell-bench-press', 4, 12, 60],
      ['bent-over-row', 4, 12, 60],
      ['shoulder-press', 3, 12, 60],
      ['bicep-curl', 3, 14, 45],
      ['overhead-tricep-extension', 3, 14, 45],
    ],
  },
  {
    id: 'shoulder-builder',
    title: 'Shoulder Builder',
    category: 'Strength',
    difficulty: 'Intermediate',
    durationMin: 35,
    calories: 240,
    cover: COVERS.strength,
    description: 'All three deltoid heads plus a press for size. Small muscles, big impact on your silhouette.',
    intensity: 'Moderate',
    place: ['gym', 'home'],
    plan: [
      ['shoulder-press', 4, 10, 60],
      ['lateral-raise', 4, 14, 45],
      ['front-raise', 3, 12, 45],
      ['rear-delt-fly', 3, 14, 45],
    ],
  },
  {
    id: 'vinyasa-flow',
    title: 'Vinyasa Flow',
    category: 'Yoga',
    difficulty: 'Beginner',
    durationMin: 30,
    calories: 150,
    cover: COVERS.yoga,
    description: 'Breath-linked movement to open the hips and shoulders and reset the nervous system.',
    intensity: 'Low',
    place: ['home', 'gym'],
    plan: [
      ['sun-salutation', 3, 60, 30, 'sec'],
      ['downward-dog', 3, 60, 30, 'sec'],
      ['warrior-two', 3, 45, 30, 'sec'],
      ['triangle-pose', 3, 40, 30, 'sec'],
      ['childs-pose', 2, 60, 30, 'sec'],
    ],
  },
  {
    id: 'power-yoga',
    title: 'Power Yoga',
    category: 'Yoga',
    difficulty: 'Intermediate',
    durationMin: 40,
    calories: 220,
    cover: COVERS.yoga,
    description: 'Strength-focused flow: long holds, balance work and a strong core throughout.',
    intensity: 'Moderate',
    place: ['home', 'gym'],
    plan: [
      ['sun-salutation', 4, 60, 20, 'sec'],
      ['warrior-two', 4, 60, 20, 'sec'],
      ['tree-pose', 3, 40, 20, 'sec'],
      ['plank', 3, 45, 30, 'sec'],
      ['cobra', 3, 40, 20, 'sec'],
    ],
  },
  {
    id: 'mobility-reset',
    title: 'Mobility Reset',
    category: 'Mobility',
    difficulty: 'Beginner',
    durationMin: 20,
    calories: 90,
    cover: COVERS.mobility,
    description: 'A short daily routine that keeps hips, spine and shoulders moving well. Great on rest days.',
    intensity: 'Low',
    place: ['home', 'gym', 'outdoor'],
    plan: [
      ['cat-cow', 3, 40, 20, 'sec'],
      ['thread-the-needle', 3, 40, 20, 'sec'],
      ['ninety-ninety', 3, 40, 20, 'sec'],
      ['hip-flexor-stretch', 2, 45, 20, 'sec'],
      ['hamstring-stretch', 2, 45, 20, 'sec'],
    ],
  },
  {
    id: 'mobility-desk-release',
    title: 'Desk Release Mobility',
    category: 'Mobility',
    difficulty: 'Intermediate',
    durationMin: 25,
    calories: 120,
    cover: COVERS.mobility,
    description: 'Undo eight hours of sitting: thoracic rotation, hip openers and a deep stretch series.',
    intensity: 'Low',
    place: ['home', 'gym'],
    plan: [
      ['thoracic-rotation', 3, 45, 20, 'sec'],
      ['world-greatest-stretch', 3, 45, 20, 'sec'],
      ['thruster', 2, 40, 30, 'sec'],
      ['ninety-ninety', 3, 45, 20, 'sec'],
      ['cobra', 3, 40, 20, 'sec'],
    ],
  },
  {
    id: 'warmup-mobility-prime',
    title: 'Mobility Prime',
    category: 'Mobility',
    difficulty: 'Beginner',
    durationMin: 12,
    calories: 70,
    cover: COVERS.mobility,
    description: 'The five-minute-before-you-lift routine. Joints first, then load.',
    intensity: 'Low',
    place: ['home', 'gym', 'outdoor'],
    plan: [
      ['cat-cow', 2, 30, 15, 'sec'],
      ['ninety-ninety', 2, 30, 15, 'sec'],
      ['world-greatest-stretch', 2, 40, 15, 'sec'],
      ['downward-dog', 2, 40, 15, 'sec'],
    ],
  },
]

export const WORKOUTS: Workout[] = seed.map((item) => {
  const exercises = plan(item.plan)
  const focus = [...new Set(exercises.map((row) => getExercise(row.exerciseId).group))] as MuscleGroup[]
  const equipment = [...new Set(exercises.map((row) => getExercise(row.exerciseId).equipment))] as Equipment[]
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    difficulty: item.difficulty,
    durationMin: item.durationMin,
    calories: item.calories,
    cover: item.cover,
    description: item.description,
    intensity: item.intensity,
    equipment,
    place: item.place,
    focus,
    exercises,
  }
})

export const WORKOUT_MAP: Record<string, Workout> = Object.fromEntries(WORKOUTS.map((w) => [w.id, w]))

export const getWorkout = (id: string): Workout | undefined => WORKOUT_MAP[id]

export const WORKOUT_CATEGORIES: WorkoutCategory[] = [
  'Strength',
  'Cardio',
  'HIIT',
  'Yoga',
  'Mobility',
  'Full Body',
  'Chest',
  'Back',
  'Legs',
  'Arms',
  'Core',
]

/** Personalised burn estimate: METs of the plan × user's body weight. */
export const workoutCalories = (workout: Workout, weightKg: number) => {
  const mets = workout.exercises.map((row) => getExercise(row.exerciseId).met)
  return caloriesFromMET(avgMET(mets), weightKg, workout.durationMin)
}

export const workoutSets = (workout: Workout) => workout.exercises.reduce((acc, e) => acc + e.sets, 0)

export const workoutRepTarget = (workout: Workout) =>
  workout.exercises.reduce((acc, e) => acc + (e.unit === 'sec' ? 0 : e.sets * e.reps), 0)

/** Rough session length derived from the actual plan volume. */
export const estimatedMinutes = (workout: Workout) => {
  const seconds = workout.exercises.reduce((acc, row) => {
    const work = row.unit === 'sec' ? row.sets * row.reps : row.sets * row.reps * 3
    return acc + work + row.sets * row.restSec
  }, 0)
  return Math.max(5, Math.round(seconds / 60))
}

/**
 * Recommendation engine: scores workouts against the user's goal, activity
 * level, experience and preferred training place.
 */
export const recommendWorkouts = (
  workouts: Workout[],
  profile: { goal: string; experience: Experience; place: string },
  limit = 4,
): Workout[] => {
  const goalBias: Record<string, WorkoutCategory[]> = {
    'lose-weight': ['HIIT', 'Cardio', 'Full Body', 'Core'],
    'build-muscle': ['Strength', 'Chest', 'Back', 'Arms', 'Legs'],
    'maintain-weight': ['Full Body', 'Cardio', 'Yoga', 'Mobility'],
    'improve-fitness': ['Full Body', 'Cardio', 'HIIT', 'Yoga'],
    'increase-strength': ['Strength', 'Legs', 'Back', 'Chest'],
    'improve-endurance': ['Cardio', 'HIIT', 'Full Body', 'Mobility'],
  }
  const difficultyOrder: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']
  const experienceToDifficulty: Record<Experience, Difficulty> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }
  const userLevel = difficultyOrder.indexOf(experienceToDifficulty[profile.experience])
  const bias = goalBias[profile.goal] ?? []

  return [...workouts]
    .map((w) => {
      let score = 0
      if (w.place.includes(profile.place as never)) score += 3
      const gap = Math.abs(difficultyOrder.indexOf(w.difficulty) - userLevel)
      score += gap === 0 ? 3 : gap === 1 ? 1.5 : 0
      const biasIndex = bias.indexOf(w.category)
      if (biasIndex >= 0) score += 4 - biasIndex * 0.75
      return { w, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.w)
}
