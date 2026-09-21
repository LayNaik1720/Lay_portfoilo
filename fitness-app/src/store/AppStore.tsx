/* ------------------------------------------------------------------
   Global application store: auth, persistence, side-effects
   (achievements, reminders, simulated pedometer) and all actions.
------------------------------------------------------------------ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { ACHIEVEMENTS } from '../lib/achievements'
import {
  buildAchievementStats,
  computeStreak,
  evaluateAchievements,
  goalMetricValue,
  minutesForDay,
  stepsForDay,
  waterForDay,
} from '../lib/fitness'
import { activeDatesFrom, buildDemoData, buildDemoUser, buildSeedGoals, emptyData, seedHistory } from '../lib/seed'
import { hashPassword, readJSON, writeJSON } from '../lib/storage'
import type {
  ActiveSession,
  AppNotification,
  BodyEntry,
  Goal,
  Meal,
  User,
  UserData,
  UserProfile,
  UserSettings,
  Workout,
  WorkoutSession,
} from '../lib/types'
import { clamp, dateKey, todayKey, uid } from '../lib/utils'
import { appReducer, type AppState, type DeepPartial } from './reducer'

export type Result = { ok: true } | { ok: false; error: string }

interface AppContextValue {
  ready: boolean
  user: User | null
  data: UserData
  isDemo: boolean
  demoCredentials: { email: string; password: string }
  actions: {
    login: (email: string, password: string) => Result
    loginWithGoogle: () => Result
    loginDemo: () => void
    register: (input: { name: string; email: string; password: string }) => Result
    logout: () => void
    completeOnboarding: (profile: UserProfile, seedSample: boolean) => void
    updateUser: (patch: Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'avatarColor'>>) => void
    updateProfile: (patch: Partial<UserProfile>) => void
    updateSettings: (patch: DeepPartial<UserSettings>) => void
    changePassword: (current: string, next: string) => Result
    deleteAccount: () => void
    resetData: () => void
    startSession: (workout: Workout) => void
    patchSession: (patch: Partial<ActiveSession>) => void
    cancelSession: () => void
    finishSession: () => WorkoutSession | null
    deleteSession: (id: string) => void
    rateSession: (id: string, feeling: WorkoutSession['feeling'], note?: string) => void
    logWater: (ml: number) => void
    removeWater: (id: string) => void
    setWaterGoal: (ml: number) => void
    addMeal: (meal: Meal) => void
    removeMeal: (id: string) => void
    addBodyEntry: (entry: BodyEntry) => void
    removeBodyEntry: (id: string) => void
    addGoal: (goal: Goal) => void
    updateGoal: (id: string, patch: Partial<Goal>) => void
    deleteGoal: (id: string) => void
    pushNotification: (notification: Omit<AppNotification, 'id' | 'at' | 'read'> & { at?: string }) => void
    markNotificationsRead: (id?: string) => void
    clearNotifications: () => void
    syncSteps: () => void
    nudgeSteps: (steps: number) => void
  }
}

const initialState: AppState = { users: [], currentUserId: null, data: {}, ready: false }

export const AppContext = createContext<AppContextValue | null>(null)

const STORAGE_KEY = 'state'
const THEME_KEY = 'theme'

/* ------------------------------ helpers ------------------------------ */

const LEVELS = [
  { name: 'Rookie', min: 0 },
  { name: 'Mover', min: 300 },
  { name: 'Athlete', min: 900 },
  { name: 'Beast', min: 1800 },
  { name: 'Legend', min: 3600 },
]

export const levelFor = (xp: number) => {
  const index = LEVELS.reduce((acc, level, i) => (xp >= level.min ? i : acc), 0)
  const next = LEVELS[index + 1]
  return {
    index,
    name: LEVELS[index].name,
    xp,
    nextAt: next?.min ?? null,
    progress: next ? clamp(((xp - LEVELS[index].min) / (next.min - LEVELS[index].min)) * 100, 0, 100) : 100,
  }
}

export const xpFromData = (data: UserData) =>
  data.sessions.length * 50 + Math.round(data.steps.reduce((acc, s) => acc + s.steps, 0) / 1000) * 2

/* ------------------------------ provider ------------------------------ */

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const stepTimer = useRef<number | null>(null)

  /* ----- hydrate once from localStorage ----- */
  useEffect(() => {
    const persisted = readJSON<{ users: User[]; currentUserId: string | null; data: Record<string, UserData> } | null>(
      STORAGE_KEY,
      null,
    )
    dispatch({
      type: 'hydrate',
      payload: persisted
        ? { users: persisted.users ?? [], currentUserId: persisted.currentUserId ?? null, data: persisted.data ?? {} }
        : {},
    })
  }, [])

  /* ----- persist ----- */
  useEffect(() => {
    if (!state.ready) return
    writeJSON(STORAGE_KEY, { users: state.users, currentUserId: state.currentUserId, data: state.data })
  }, [state.ready, state.users, state.currentUserId, state.data])

  const user = useMemo(() => state.users.find((u) => u.id === state.currentUserId) ?? null, [state.users, state.currentUserId])
  const data = useMemo(() => state.data[state.currentUserId ?? ''] ?? emptyData(), [state.data, state.currentUserId])
  const isDemo = user?.email === 'alex@pulse.fit'

  /* ----- theme + document wiring ----- */
  useEffect(() => {
    const mode = user?.settings.theme ?? 'dark'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = mode === 'dark' || (mode === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', dark)
    writeJSON(THEME_KEY, mode)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#070b0f' : '#f2f5f7')
  }, [user?.settings.theme])

  /* ----- achievements ----- */
  useEffect(() => {
    if (!user) return
    const streak = computeStreak(activeDatesFrom(data, user.profile.targets.stepsGoal))
    const stats = buildAchievementStats({
      sessions: data.sessions,
      steps: data.steps,
      water: data.water,
      goals: data.goals,
      streak: streak.current,
    })
    const unlockedIds = data.achievements.map((a) => a.id)
    const fresh = evaluateAchievements(ACHIEVEMENTS, stats, unlockedIds)
    if (!fresh.length) return
    dispatch({
      type: 'achievements/unlock',
      payload: fresh.map((id) => ({ id, unlockedAt: new Date().toISOString() })),
    })
    fresh.forEach((id) => {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id)
      if (!achievement) return
      dispatch({
        type: 'notifications/add',
        payload: [
          {
            id: uid('notif'),
            kind: 'achievement',
            title: `${achievement.emoji} ${achievement.name} unlocked!`,
            body: achievement.description,
            at: new Date().toISOString(),
            read: false,
          },
        ],
      })
    })
  }, [user, data])

  /* ----- live goal progress ----- */
  useEffect(() => {
    if (!user) return
    const latestWeight = [...data.body].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.weightKg ?? user.profile.weightKg
    const ctx = {
      weightKg: latestWeight,
      sessions: data.sessions,
      steps: data.steps,
      water: data.water,
      meals: data.meals,
    }
    const payload: Record<string, { current: number; status?: Goal['status'] }> = {}
    data.goals.forEach((goal) => {
      if (goal.status === 'archived') return
      const current = goalMetricValue(goal, ctx)
      const reached = goal.direction === 'increase' ? current >= goal.target : current <= goal.target
      const status: Goal['status'] = reached ? 'completed' : goal.status === 'completed' ? 'active' : goal.status
      if (current !== goal.current || status !== goal.status) payload[goal.id] = { current, status }
    })
    if (Object.keys(payload).length) dispatch({ type: 'goal/progress', payload })
  }, [user, data])

  /* ----- simulated pedometer: today's steps tick up while the app is open ----- */
  const syncSteps = useCallback(() => {
    if (!user) return
    const now = new Date()
    const hour = now.getHours() + now.getMinutes() / 60
    const activeWindow = clamp((hour - 6) / 15, 0, 1)
    const target = user.profile.targets.stepsGoal
    const base = Math.round(target * activeWindow * 0.92)
    const existing = stepsForDay(data.steps, todayKey())
    const next = Math.max(existing, base)
    if (next === existing) return
    dispatch({ type: 'steps/set', payload: { id: uid('step'), date: todayKey(), steps: next } })
  }, [user, data.steps])

  useEffect(() => {
    if (!state.ready || !user) return
    syncSteps()
    stepTimer.current = window.setInterval(syncSteps, 45000)
    return () => {
      if (stepTimer.current) window.clearInterval(stepTimer.current)
    }
  }, [state.ready, user, syncSteps])

  /* ----- reminder notifications ----- */
  useEffect(() => {
    if (!state.ready || !user) return
    const today = todayKey()
    const alreadyToday = (kind: AppNotification['kind']) =>
      data.notifications.some((n) => n.kind === kind && dateKey(n.at) === today)
    const hour = new Date().getHours()
    const push = (notification: Omit<AppNotification, 'id' | 'at' | 'read'> & { at?: string }) =>
      dispatch({
        type: 'notifications/add',
        payload: [{ id: uid('notif'), at: notification.at ?? new Date().toISOString(), read: false, ...notification }],
      })

    const prefs = user.settings.notifications
    const sessionsToday = data.sessions.filter((s) => s.date === today).length
    const waterToday = waterForDay(data.water, today)
    const stepsToday = stepsForDay(data.steps, today)
    const workoutMinutes = minutesForDay(data.sessions, today)
    const streak = computeStreak(activeDatesFrom(data, user.profile.targets.stepsGoal)).current

    if (prefs.workout && sessionsToday === 0 && hour >= 17 && !alreadyToday('workout')) {
      push({
        kind: 'workout',
        title: "💪 It's workout time!",
        body: `A ${user.profile.targets.dailyMinutes} minute session is all it takes to keep the momentum.`,
      })
    }
    if (prefs.water && waterToday < user.profile.targets.waterGoalMl * 0.7 && hour >= 16 && !alreadyToday('water')) {
      push({
        kind: 'water',
        title: '💧 Hydration check',
        body: `You're ${Math.round((user.profile.targets.waterGoalMl - waterToday) / 50) * 50}ml away from your water goal.`,
      })
    }
    if (prefs.streak && streak >= 3 && sessionsToday === 0 && stepsToday < user.profile.targets.stepsGoal && hour >= 19 && !alreadyToday('streak')) {
      push({
        kind: 'streak',
        title: `🔥 ${streak} day streak at risk`,
        body: 'A short session or a walk tonight keeps it alive.',
      })
    }
    if (prefs.weekly && new Date().getDay() === 0 && hour >= 18 && !alreadyToday('report')) {
      push({
        kind: 'report',
        title: '📈 Your weekly report is ready',
        body: `${data.sessions.filter((s) => s.date >= dateKey(new Date(Date.now() - 6 * 86400000))).length} workouts and ${Math.round(
          workoutMinutes / 60,
        )}h today. See the full breakdown on Progress.`,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ready, user?.id, user?.settings.notifications, data.sessions, data.water, data.steps, data.notifications])

  /* ------------------------------ actions ------------------------------ */

  const login = useCallback<AppContextValue['actions']['login']>(
    (email, password) => {
      const found = state.users.find((u) => u.email === email.trim().toLowerCase())
      if (!found) return { ok: false, error: 'No account found with that email address.' }
      if (found.passwordHash !== hashPassword(password)) return { ok: false, error: 'Incorrect password. Please try again.' }
      dispatch({ type: 'auth/login', payload: { userId: found.id } })
      return { ok: true }
    },
    [state.users],
  )

  const loginWithGoogle = useCallback<AppContextValue['actions']['loginWithGoogle']>(() => {
    const email = 'alex.carter@gmail.com'
    const existing = state.users.find((u) => u.email === email)
    if (existing) {
      dispatch({ type: 'auth/login', payload: { userId: existing.id } })
      return { ok: true }
    }
    const user = buildDemoUser(hashPassword(uid('google')))
    user.name = 'Alex Carter'
    user.email = email
    user.provider = 'google'
    user.avatarColor = '#38BDF8'
    dispatch({ type: 'auth/google', payload: { user, data: emptyData() } })
    return { ok: true }
  }, [state.users])

  const loginDemo = useCallback(() => {
    const demo = state.users.find((u) => u.email === 'alex@pulse.fit')
    if (demo) {
      dispatch({ type: 'auth/login', payload: { userId: demo.id } })
      return
    }
    const user = buildDemoUser(hashPassword('pulse1234'))
    dispatch({ type: 'auth/google', payload: { user, data: buildDemoData(user) } })
  }, [state.users])

  const register = useCallback<AppContextValue['actions']['register']>(
    ({ name, email, password }) => {
      const normalised = email.trim().toLowerCase()
      if (state.users.some((u) => u.email === normalised)) {
        return { ok: false, error: 'An account with that email already exists.' }
      }
      const user = buildDemoUser(hashPassword(password))
      user.id = uid('user')
      user.name = name.trim()
      user.email = normalised
      user.provider = 'email'
      user.profile = { ...user.profile, onboarded: false }
      user.settings = { ...user.settings, theme: 'dark' }
      dispatch({ type: 'auth/register', payload: { user, data: emptyData() } })
      return { ok: true }
    },
    [state.users],
  )

  const completeOnboarding = useCallback<AppContextValue['actions']['completeOnboarding']>(
    (profile, seedSample) => {
      if (!user) return
      const nextProfile = { ...profile }
      const seeded = seedSample ? seedHistory({ ...nextProfile }, 84) : seedHistory({ ...nextProfile }, 10)
      dispatch({ type: 'user/profile', payload: nextProfile })
      dispatch({
        type: 'data/reset',
        payload: {
          ...emptyData(),
          steps: seeded.steps,
          water: seeded.water,
          meals: seedSample ? seeded.meals : seeded.meals.slice(-4),
          body: seeded.body,
          goals: seeded.goals,
          notifications: seeded.notifications,
          sessions: seedSample ? seeded.sessions : [],
          achievements: seeded.achievements,
          lastStepSync: seeded.lastStepSync,
        },
      })
    },
    [user],
  )

  const actions = useMemo<AppContextValue['actions']>(
    () => ({
      login,
      loginWithGoogle,
      loginDemo,
      register,
      logout: () => dispatch({ type: 'auth/logout' }),
      completeOnboarding,
      updateUser: (patch) => dispatch({ type: 'user/update', payload: patch }),
      updateProfile: (patch) => dispatch({ type: 'user/profile', payload: patch }),
      updateSettings: (patch) => dispatch({ type: 'user/settings', payload: patch }),
      changePassword: (current, next) => {
        if (!user) return { ok: false, error: 'You are not signed in.' }
        if (user.passwordHash !== hashPassword(current)) return { ok: false, error: 'Current password is incorrect.' }
        dispatch({ type: 'user/password', payload: { passwordHash: hashPassword(next) } })
        return { ok: true }
      },
      deleteAccount: () => dispatch({ type: 'user/delete' }),
      resetData: () => {
        if (!user) return
        dispatch({
          type: 'data/reset',
          payload: {
            ...emptyData(),
            goals: buildSeedGoals(user.profile, user.profile.weightKg),
          },
        })
      },
      startSession: (workout) => {
        if (!user) return
        dispatch({
          type: 'session/start',
          payload: {
            workoutId: workout.id,
            title: workout.title,
            cover: workout.cover,
            startedAt: new Date().toISOString(),
            elapsedBeforePause: 0,
            index: 0,
            paused: false,
            caloriesPerMin:
              workout.calories / Math.max(1, workout.durationMin) || 7,
            exercises: workout.exercises.map((row) => ({
              exerciseId: row.exerciseId,
              restSec: row.restSec,
              sets: Array.from({ length: row.sets }, () => ({ reps: row.reps, done: false })),
            })),
          },
        })
      },
      patchSession: (patch) => dispatch({ type: 'session/patch', payload: patch }),
      cancelSession: () => dispatch({ type: 'session/cancel' }),
      finishSession: () => {
        if (!user) return null
        const active = data.activeSession
        if (!active) return null
        const finishedAt = new Date()
        const startedAt = new Date(active.startedAt).getTime()
        const durationSec = Math.max(30, Math.round((finishedAt.getTime() - startedAt) / 1000))
        const totalSets = active.exercises.reduce((acc, e) => acc + e.sets.length, 0)
        const completedSets = active.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.done).length, 0)
        const completion = totalSets ? Math.round((completedSets / totalSets) * 100) : 0
        const session: WorkoutSession = {
          id: uid('session'),
          workoutId: active.workoutId,
          title: active.title,
          category: (data.sessions.find((s) => s.workoutId === active.workoutId)?.category ?? 'Full Body') as WorkoutSession['category'],
          cover: active.cover,
          date: dateKey(finishedAt),
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationSec,
          caloriesBurned: Math.round((active.caloriesPerMin * durationSec) / 60),
          totalSets,
          completedSets,
          completion,
          exercises: active.exercises,
        }
        dispatch({ type: 'session/complete', payload: session })
        return session
      },
      deleteSession: (id) => dispatch({ type: 'session/delete', payload: id }),
      rateSession: (id, feeling, note) => dispatch({ type: 'session/rate', payload: { id, feeling, note } }),
      logWater: (ml) => dispatch({ type: 'water/add', payload: { id: uid('water'), date: todayKey(), ml, at: new Date().toISOString() } }),
      removeWater: (id) => dispatch({ type: 'water/remove', payload: id }),
      setWaterGoal: (ml) => dispatch({ type: 'water/goal', payload: clamp(ml, 500, 6000) }),
      addMeal: (meal) => dispatch({ type: 'meal/add', payload: meal }),
      removeMeal: (id) => dispatch({ type: 'meal/remove', payload: id }),
      addBodyEntry: (entry) => dispatch({ type: 'body/add', payload: entry }),
      removeBodyEntry: (id) => dispatch({ type: 'body/remove', payload: id }),
      addGoal: (goal) => dispatch({ type: 'goal/add', payload: goal }),
      updateGoal: (id, patch) => dispatch({ type: 'goal/update', payload: { id, patch } }),
      deleteGoal: (id) => dispatch({ type: 'goal/delete', payload: id }),
      pushNotification: (notification) =>
        dispatch({
          type: 'notifications/add',
          payload: [{ id: uid('notif'), at: notification.at ?? new Date().toISOString(), read: false, ...notification }],
        }),
      markNotificationsRead: (id) => dispatch({ type: 'notifications/read', payload: id }),
      clearNotifications: () => dispatch({ type: 'notifications/clear' }),
      syncSteps,
      nudgeSteps: (steps) => {
        const existing = stepsForDay(data.steps, todayKey())
        dispatch({
          type: 'steps/set',
          payload: { id: uid('step'), date: todayKey(), steps: Math.max(0, existing + steps) },
        })
      },
    }),
    [user, data, login, loginWithGoogle, loginDemo, register, completeOnboarding, syncSteps],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ready: state.ready,
      user,
      data,
      isDemo,
      demoCredentials: { email: 'alex@pulse.fit', password: 'pulse1234' },
      actions,
    }),
    [state.ready, user, data, isDemo, actions],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/* ---------------------------- derived hooks ---------------------------- */

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

/** Convenience selector for the signed-in user (throws only if misused). */
export function useCurrentUser(): User {
  const { user } = useApp()
  if (!user) throw new Error('useCurrentUser used outside an authenticated route')
  return user
}
