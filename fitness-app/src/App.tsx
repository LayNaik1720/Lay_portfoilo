import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppStore'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/Confirm'
import { AppLayout } from './components/layout/AppLayout'
import { SplashScreen } from './components/layout/SplashScreen'

/* Pages are code-split so the first paint stays light. */
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const WorkoutsPage = lazy(() => import('./pages/WorkoutsPage'))
const WorkoutDetailPage = lazy(() => import('./pages/WorkoutDetailPage'))
const ActiveWorkoutPage = lazy(() => import('./pages/ActiveWorkoutPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const NutritionPage = lazy(() => import('./pages/NutritionPage'))
const WaterPage = lazy(() => import('./pages/WaterPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage'))
const BodyPage = lazy(() => import('./pages/BodyPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useApp()
  const location = useLocation()
  if (!ready) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!user.profile.onboarded) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { ready, user } = useApp()
  if (!ready) return <SplashScreen />
  if (user) return <Navigate to={user.profile.onboarded ? '/dashboard' : '/onboarding'} replace />
  return <>{children}</>
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const { ready, user } = useApp()
  if (!ready) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.profile.onboarded) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { ready, user } = useApp()
  if (!ready) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.profile.onboarded ? '/dashboard' : '/onboarding'} replace />
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Suspense fallback={<SplashScreen />}>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route
                path="/login"
                element={
                  <PublicOnly>
                    <LoginPage />
                  </PublicOnly>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnly>
                    <RegisterPage />
                  </PublicOnly>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <OnboardingGate>
                    <OnboardingPage />
                  </OnboardingGate>
                }
              />

              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/workouts" element={<WorkoutsPage />} />
                <Route path="/workouts/:workoutId" element={<WorkoutDetailPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/nutrition" element={<NutritionPage />} />
                <Route path="/water" element={<WaterPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/body" element={<BodyPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              <Route
                path="/active-workout"
                element={
                  <RequireAuth>
                    <ActiveWorkoutPage />
                  </RequireAuth>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ConfirmProvider>
      </ToastProvider>
    </AppProvider>
  )
}
