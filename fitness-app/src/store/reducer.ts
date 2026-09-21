/* ------------------------------------------------------------------
   Pure state reducer. Every mutation the UI can trigger lives here so
   the store stays testable and the persistence layer stays dumb.
------------------------------------------------------------------ */
import type {
  ActiveSession,
  AppNotification,
  BodyEntry,
  Goal,
  Meal,
  StepLog,
  UnlockedAchievement,
  User,
  UserData,
  UserProfile,
  UserSettings,
  WaterLog,
  WorkoutSession,
} from '../lib/types'

export interface AppState {
  users: User[]
  currentUserId: string | null
  data: Record<string, UserData>
  ready: boolean
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

export type Action =
  | { type: 'hydrate'; payload: Partial<AppState> }
  | { type: 'auth/register'; payload: { user: User; data: UserData } }
  | { type: 'auth/login'; payload: { userId: string } }
  | { type: 'auth/logout' }
  | { type: 'auth/google'; payload: { user: User; data: UserData } }
  | { type: 'user/update'; payload: Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'avatarColor'>> }
  | { type: 'user/profile'; payload: Partial<UserProfile> }
  | { type: 'user/settings'; payload: DeepPartial<UserSettings> }
  | { type: 'user/password'; payload: { passwordHash: string } }
  | { type: 'user/delete' }
  | { type: 'data/reset'; payload: UserData }
  | { type: 'session/start'; payload: ActiveSession }
  | { type: 'session/patch'; payload: Partial<ActiveSession> }
  | { type: 'session/cancel' }
  | { type: 'session/complete'; payload: WorkoutSession }
  | { type: 'session/delete'; payload: string }
  | { type: 'session/rate'; payload: { id: string; note?: string; feeling?: WorkoutSession['feeling'] } }
  | { type: 'water/add'; payload: WaterLog }
  | { type: 'water/remove'; payload: string }
  | { type: 'water/goal'; payload: number }
  | { type: 'meal/add'; payload: Meal }
  | { type: 'meal/remove'; payload: string }
  | { type: 'body/add'; payload: BodyEntry }
  | { type: 'body/remove'; payload: string }
  | { type: 'goal/add'; payload: Goal }
  | { type: 'goal/update'; payload: { id: string; patch: Partial<Goal> } }
  | { type: 'goal/delete'; payload: string }
  | { type: 'goal/progress'; payload: Record<string, { current: number; status?: Goal['status'] }> }
  | { type: 'steps/set'; payload: StepLog }
  | { type: 'notifications/add'; payload: AppNotification[] }
  | { type: 'notifications/read'; payload?: string }
  | { type: 'notifications/clear' }
  | { type: 'achievements/unlock'; payload: UnlockedAchievement[] }

const EMPTY_USER_DATA: UserData = {
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
}

const cloneUserData = (data: UserData | undefined): UserData => ({
  ...EMPTY_USER_DATA,
  ...(data ?? {}),
})

/** apply a patch function to the signed-in user's data bucket */
const patchData = (state: AppState, fn: (data: UserData) => UserData): AppState => {
  const id = state.currentUserId
  if (!id) return state
  const current = cloneUserData(state.data[id])
  return { ...state, data: { ...state.data, [id]: fn(current) } }
}

const patchUser = (state: AppState, fn: (user: User) => User): AppState => ({
  ...state,
  users: state.users.map((u) => (state.currentUserId === u.id ? fn(u) : u)),
})

const mergeSettings = (base: UserSettings, patch: DeepPartial<UserSettings>): UserSettings => ({
  ...base,
  ...patch,
  notifications: { ...base.notifications, ...(patch.notifications ?? {}) },
  privacy: { ...base.privacy, ...(patch.privacy ?? {}) },
})

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload, ready: true }

    case 'auth/register':
      return {
        ...state,
        users: [...state.users.filter((u) => u.email !== action.payload.user.email), action.payload.user],
        currentUserId: action.payload.user.id,
        data: { ...state.data, [action.payload.user.id]: action.payload.data },
      }

    case 'auth/login':
      return { ...state, currentUserId: action.payload.userId }

    case 'auth/google':
      return {
        ...state,
        users: [...state.users.filter((u) => u.email !== action.payload.user.email), action.payload.user],
        currentUserId: action.payload.user.id,
        data: { ...state.data, [action.payload.user.id]: action.payload.data },
      }

    case 'auth/logout':
      return { ...state, currentUserId: null }

    case 'user/update':
      return patchUser(state, (user) => ({ ...user, ...action.payload }))

    case 'user/profile':
      return patchUser(state, (user) => ({ ...user, profile: { ...user.profile, ...action.payload } }))

    case 'user/settings':
      return patchUser(state, (user) => ({ ...user, settings: mergeSettings(user.settings, action.payload) }))

    case 'user/password':
      return patchUser(state, (user) => ({ ...user, passwordHash: action.payload.passwordHash }))

    case 'user/delete': {
      const id = state.currentUserId
      if (!id) return state
      const data = { ...state.data }
      delete data[id]
      return { ...state, users: state.users.filter((u) => u.id !== id), data, currentUserId: null }
    }

    case 'data/reset':
      return patchData(state, () => action.payload)

    case 'session/start':
      return patchData(state, (data) => ({ ...data, activeSession: action.payload }))

    case 'session/patch':
      return patchData(state, (data) => ({
        ...data,
        activeSession: data.activeSession ? { ...data.activeSession, ...action.payload } : null,
      }))

    case 'session/cancel':
      return patchData(state, (data) => ({ ...data, activeSession: null }))

    case 'session/complete':
      return patchData(state, (data) => ({
        ...data,
        sessions: [action.payload, ...data.sessions],
        activeSession: null,
      }))

    case 'session/delete':
      return patchData(state, (data) => ({
        ...data,
        sessions: data.sessions.filter((s) => s.id !== action.payload),
      }))

    case 'session/rate':
      return patchData(state, (data) => ({
        ...data,
        sessions: data.sessions.map((s) =>
          s.id === action.payload.id ? { ...s, note: action.payload.note ?? s.note, feeling: action.payload.feeling ?? s.feeling } : s,
        ),
      }))

    case 'water/add':
      return patchData(state, (data) => ({ ...data, water: [...data.water, action.payload] }))

    case 'water/remove':
      return patchData(state, (data) => ({ ...data, water: data.water.filter((w) => w.id !== action.payload) }))

    case 'water/goal':
      return patchUser(state, (user) => ({
        ...user,
        profile: { ...user.profile, targets: { ...user.profile.targets, waterGoalMl: action.payload } },
      }))

    case 'meal/add':
      return patchData(state, (data) => ({ ...data, meals: [...data.meals, action.payload] }))

    case 'meal/remove':
      return patchData(state, (data) => ({ ...data, meals: data.meals.filter((m) => m.id !== action.payload) }))

    case 'body/add':
      return patchData(state, (data) => ({ ...data, body: [...data.body.filter((b) => b.date !== action.payload.date), action.payload] }))

    case 'body/remove':
      return patchData(state, (data) => ({ ...data, body: data.body.filter((b) => b.id !== action.payload) }))

    case 'goal/add':
      return patchData(state, (data) => ({ ...data, goals: [action.payload, ...data.goals] }))

    case 'goal/update':
      return patchData(state, (data) => ({
        ...data,
        goals: data.goals.map((g) => (g.id === action.payload.id ? { ...g, ...action.payload.patch } : g)),
      }))

    case 'goal/delete':
      return patchData(state, (data) => ({ ...data, goals: data.goals.filter((g) => g.id !== action.payload) }))

    case 'goal/progress':
      return patchData(state, (data) => ({
        ...data,
        goals: data.goals.map((g) => {
          const next = action.payload[g.id]
          return next ? { ...g, current: next.current, status: next.status ?? g.status } : g
        }),
      }))

    case 'steps/set':
      return patchData(state, (data) => ({
        ...data,
        steps: [...data.steps.filter((s) => s.date !== action.payload.date), action.payload],
        lastStepSync: new Date().toISOString(),
      }))

    case 'notifications/add':
      return patchData(state, (data) => ({
        ...data,
        notifications: [...action.payload, ...data.notifications].slice(0, 60),
      }))

    case 'notifications/read':
      return patchData(state, (data) => ({
        ...data,
        notifications:
          action.payload === undefined
            ? data.notifications.map((n) => ({ ...n, read: true }))
            : data.notifications.map((n) => (n.id === action.payload ? { ...n, read: true } : n)),
      }))

    case 'notifications/clear':
      return patchData(state, (data) => ({ ...data, notifications: [] }))

    case 'achievements/unlock':
      return patchData(state, (data) => ({
        ...data,
        achievements: [
          ...data.achievements,
          ...action.payload.filter((a) => !data.achievements.some((existing) => existing.id === a.id)),
        ],
      }))

    default:
      return state
  }
}
