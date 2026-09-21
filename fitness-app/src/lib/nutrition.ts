/* ------------------------------------------------------------------
   Nutrition helpers: a small food library for quick logging and
   macro-target maths derived from the user's calorie goal.
------------------------------------------------------------------ */
import type { MealType } from './types'
import { round } from './utils'

export const FOOD_LIBRARY: { name: string; type: MealType; calories: number; protein: number; carbs: number; fat: number }[] = [
  { name: 'Oatmeal with banana', type: 'breakfast', calories: 410, protein: 15, carbs: 68, fat: 9 },
  { name: 'Greek yogurt & berries', type: 'breakfast', calories: 320, protein: 24, carbs: 38, fat: 8 },
  { name: 'Scrambled eggs on toast', type: 'breakfast', calories: 480, protein: 28, carbs: 34, fat: 24 },
  { name: 'Protein smoothie', type: 'breakfast', calories: 350, protein: 32, carbs: 44, fat: 6 },
  { name: 'Grilled chicken & rice', type: 'lunch', calories: 620, protein: 48, carbs: 66, fat: 14 },
  { name: 'Turkey wrap & salad', type: 'lunch', calories: 540, protein: 38, carbs: 52, fat: 18 },
  { name: 'Quinoa power bowl', type: 'lunch', calories: 580, protein: 26, carbs: 72, fat: 19 },
  { name: 'Tuna pasta salad', type: 'lunch', calories: 510, protein: 34, carbs: 58, fat: 15 },
  { name: 'Salmon, potatoes & greens', type: 'dinner', calories: 690, protein: 45, carbs: 48, fat: 30 },
  { name: 'Steak & roasted veg', type: 'dinner', calories: 720, protein: 52, carbs: 32, fat: 38 },
  { name: 'Chicken stir fry', type: 'dinner', calories: 610, protein: 44, carbs: 58, fat: 20 },
  { name: 'Lentil curry & rice', type: 'dinner', calories: 560, protein: 22, carbs: 78, fat: 14 },
  { name: 'Cottage cheese bowl', type: 'snack', calories: 210, protein: 22, carbs: 12, fat: 8 },
  { name: 'Almonds & apple', type: 'snack', calories: 240, protein: 6, carbs: 28, fat: 13 },
  { name: 'Protein bar', type: 'snack', calories: 220, protein: 20, carbs: 24, fat: 7 },
  { name: 'Rice cakes & peanut butter', type: 'snack', calories: 280, protein: 10, carbs: 30, fat: 14 },
]

export const macroTargets = (caloriesGoal: number, weightKg: number) => {
  const protein = Math.round(Math.max(weightKg * 1.8, caloriesGoal * 0.25 / 4))
  const fat = Math.round((caloriesGoal * 0.27) / 9)
  const carbs = Math.round(Math.max(0, (caloriesGoal - protein * 4 - fat * 9) / 4))
  return { protein, carbs, fat }
}

export const mealCalories = (meals: { calories: number }[]) => round(meals.reduce((acc, meal) => acc + meal.calories, 0), 0)
