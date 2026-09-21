import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellRing,
  Camera,
  Download,
  Droplets,
  Flame,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sun,
  Trash,
  Trophy,
  User,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Segmented } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { useApp } from '../store/AppStore'
import { useFitness } from '../store/useFitness'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/Confirm'
import { ACTIVITY_META, GOAL_META, calcTargets } from '../lib/fitness'
import type { ActivityLevel, Experience, FitnessGoal, Gender, ThemeMode, Units, WorkoutPlace } from '../lib/types'
import { formatHeight, formatWeight, isEmail, percent, round } from '../lib/utils'

export default function ProfilePage() {
  const { user, data, actions, isDemo } = useApp()
  const fitness = useFitness()
  const toast = useToast()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    age: user?.profile.age ?? 28,
    gender: user?.profile.gender ?? 'male',
    heightCm: user?.profile.heightCm ?? 175,
    weightKg: user?.profile.weightKg ?? 75,
    goal: user?.profile.goal ?? 'lose-weight',
    activityLevel: user?.profile.activityLevel ?? 'moderate',
    experience: user?.profile.experience ?? 'beginner',
    place: user?.profile.place ?? 'home',
  }))
  const [targetDraft, setTargetDraft] = useState(() => ({ ...(user?.profile.targets ?? { caloriesGoal: 2200, stepsGoal: 10000, waterGoalMl: 2500, weeklyWorkouts: 5, dailyMinutes: 45 }) }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  const units: Units = user?.settings.units ?? 'metric'
  const achievements = useMemo(() => fitness.achievements, [fitness.achievements])

  if (!user) return null

  const savedPersonal = () => {
    const next: Record<string, string> = {}
    if (form.name.trim().length < 2) next.name = 'Enter your name.'
    if (!isEmail(form.email)) next.email = 'Enter a valid email.'
    if (form.age < 12 || form.age > 90) next.age = 'Age must be between 12 and 90.'
    if (form.heightCm < 120 || form.heightCm > 230) next.heightCm = 'Height must be 120–230 cm.'
    if (form.weightKg < 30 || form.weightKg > 300) next.weightKg = 'Weight must be 30–300 kg.'
    setErrors(next)
    if (Object.keys(next).length) return

    actions.updateUser({ name: form.name.trim(), email: form.email.trim().toLowerCase() })
    actions.updateProfile({
      age: form.age,
      gender: form.gender as Gender,
      heightCm: form.heightCm,
      weightKg: form.weightKg,
      goal: form.goal as FitnessGoal,
      activityLevel: form.activityLevel as ActivityLevel,
      experience: form.experience as Experience,
      place: form.place as WorkoutPlace,
      targets: calcTargets({
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        age: form.age,
        gender: form.gender as Gender,
        activityLevel: form.activityLevel as ActivityLevel,
        goal: form.goal as FitnessGoal,
      }),
    })
    toast.success('Profile updated', 'Targets recalculated from your latest stats.')
  }

  const handlePhoto = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Unsupported file', 'Please choose an image file.')
      return
    }
    if (file.size > 2_000_000) {
      toast.error('Image too large', 'Pick an image under 2MB so it stores locally.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      actions.updateUser({ avatarUrl: String(reader.result) })
      toast.success('Profile photo updated')
    }
    reader.readAsDataURL(file)
  }

  const saveTargets = () => {
    actions.updateProfile({ targets: { ...targetDraft } })
    toast.success('Targets saved', 'Your dashboard goals have been updated.')
  }

  const changePassword = () => {
    const next: Record<string, string> = {}
    if (!passwordForm.current) next.current = 'Enter your current password.'
    if (passwordForm.next.length < 8) next.next = 'Use at least 8 characters.'
    if (passwordForm.next !== passwordForm.confirm) next.confirm = 'Passwords do not match.'
    setPasswordErrors(next)
    if (Object.keys(next).length) return

    const result = actions.changePassword(passwordForm.current, passwordForm.next)
    if (!result.ok) {
      setPasswordErrors({ current: result.error })
      return
    }
    setPasswordOpen(false)
    setPasswordForm({ current: '', next: '', confirm: '' })
    toast.success('Password updated', 'Use your new password next time you log in.')
  }

  const exportData = () => {
    const payload = { user: { ...user, passwordHash: undefined }, data }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pulse-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready', 'Your training data was downloaded as JSON.')
  }

  const resetData = async () => {
    const ok = await confirm({
      title: 'Reset all training data?',
      description: 'Workouts, meals, water, steps, body entries and achievements will be cleared. Your account and goals stay.',
      confirmLabel: 'Reset data',
      tone: 'danger',
    })
    if (!ok) return
    actions.resetData()
    toast.success('Data reset', 'Fresh start — your goals are ready to track again.')
  }

  const deleteAccount = async () => {
    const ok = await confirm({
      title: 'Delete your account?',
      description: 'This removes your profile and every logged record from this device. It cannot be undone.',
      confirmLabel: 'Delete everything',
      tone: 'danger',
    })
    if (!ok) return
    actions.deleteAccount()
    toast.info('Account deleted', 'Thanks for training with Pulse.')
    navigate('/login')
  }

  const logout = async () => {
    const ok = await confirm({ title: 'Log out of Pulse?', confirmLabel: 'Log out', tone: 'danger' })
    if (!ok) return
    actions.logout()
    navigate('/login')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profile"
        subtitle="Your details, targets, preferences and data"
        action={
          <Segmented
            ariaLabel="Theme"
            size="sm"
            value={user.settings.theme}
            onChange={(value) => actions.updateSettings({ theme: value as ThemeMode })}
            options={[
              { value: 'light', label: 'Light', icon: <Sun size={13} /> },
              { value: 'dark', label: 'Dark', icon: <Moon size={13} /> },
              { value: 'system', label: 'Auto', icon: <Monitor size={13} /> },
            ]}
          />
        }
      />

      {/* identity */}
      <Card className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={user.name} color={user.avatarColor} url={user.avatarUrl} size={84} ring />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-emerald-500 text-emerald-950 shadow-soft transition-transform hover:scale-105"
              aria-label="Change profile photo"
            >
              <Camera size={15} aria-hidden />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handlePhoto(event.target.files?.[0])}
            />
          </div>
          <div>
            <h2 className="font-display text-xl font-extrabold">{user.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Mail size={14} aria-hidden />
              {user.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="brand">{GOAL_META[user.profile.goal].label}</Badge>
              <Badge tone="violet">{fitness.level.name}</Badge>
              <Badge tone="calorie">🔥 {fitness.streak.current} day streak</Badge>
              {isDemo ? <Badge tone="amber">Demo account</Badge> : null}
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-3 gap-3">
          {[
            { label: 'Workouts', value: `${fitness.stats.sessions}` },
            { label: 'Badges', value: `${fitness.unlockedCount}/${achievements.length}` },
            { label: 'Minutes', value: `${fitness.stats.minutes}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-line bg-surface2/50 p-3 text-center">
              <p className="font-display text-lg font-extrabold tabular-nums">{stat.value}</p>
              <p className="text-[11px] font-semibold text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        <ProgressRing value={percent(fitness.stats.sessions, Math.max(1, fitness.targets.weeklyWorkouts * 4))} size={92} stroke={9} tone="amber" label="Monthly workout progress">
          <div>
            <p className="text-sm font-extrabold tabular-nums">{fitness.week.sessions}/{fitness.targets.weeklyWorkouts}</p>
            <p className="text-[10px] font-semibold text-muted">this week</p>
          </div>
        </ProgressRing>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* personal information */}
        <Card className="p-5">
          <SectionHeader
            title="Personal information"
            subtitle="Used across every calculation in the app"
            icon={<User size={18} className="text-emerald-600 dark:text-emerald-400" />}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} error={errors.name} />
            <Input label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} error={errors.email} />
            <Input
              label="Age"
              type="number"
              value={form.age}
              onChange={(event) => setForm((prev) => ({ ...prev, age: Number(event.target.value) }))}
              error={errors.age}
              suffix="years"
            />
            <Select label="Gender" value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value as Gender }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Prefer not to say</option>
            </Select>
            <Input
              label="Height"
              type="number"
              value={form.heightCm}
              onChange={(event) => setForm((prev) => ({ ...prev, heightCm: Number(event.target.value) }))}
              error={errors.heightCm}
              suffix="cm"
              hint={formatHeight(form.heightCm, units)}
            />
            <Input
              label="Weight"
              type="number"
              step="0.1"
              value={form.weightKg}
              onChange={(event) => setForm((prev) => ({ ...prev, weightKg: Number(event.target.value) }))}
              error={errors.weightKg}
              suffix="kg"
              hint={formatWeight(form.weightKg, units)}
            />
            <Select label="Fitness goal" value={form.goal} onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value as FitnessGoal }))}>
              {(Object.keys(GOAL_META) as FitnessGoal[]).map((goal) => (
                <option key={goal} value={goal}>
                  {GOAL_META[goal].label}
                </option>
              ))}
            </Select>
            <Select
              label="Activity level"
              value={form.activityLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, activityLevel: event.target.value as ActivityLevel }))}
            >
              {(Object.keys(ACTIVITY_META) as ActivityLevel[]).map((level) => (
                <option key={level} value={level}>
                  {ACTIVITY_META[level].label}
                </option>
              ))}
            </Select>
            <Select label="Experience" value={form.experience} onChange={(event) => setForm((prev) => ({ ...prev, experience: event.target.value as Experience }))}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
            <Select label="Preferred place" value={form.place} onChange={(event) => setForm((prev) => ({ ...prev, place: event.target.value as WorkoutPlace }))}>
              <option value="gym">Gym</option>
              <option value="home">Home</option>
              <option value="outdoor">Outdoor</option>
            </Select>
          </div>
          <Button className="mt-5" onClick={savedPersonal} icon={<Save size={16} />}>
            Save changes
          </Button>
        </Card>

        <div className="space-y-5">
          {/* fitness targets */}
          <Card className="p-5">
            <SectionHeader
              title="Fitness goals"
              subtitle="Daily and weekly targets"
              icon={<Flame size={18} className="text-orange-500" />}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw size={15} />}
                  onClick={() => {
                    const recalculated = calcTargets({
                      weightKg: form.weightKg,
                      heightCm: form.heightCm,
                      age: form.age,
                      gender: form.gender as Gender,
                      activityLevel: form.activityLevel as ActivityLevel,
                      goal: form.goal as FitnessGoal,
                    })
                    setTargetDraft(recalculated)
                    toast.info('Suggested targets ready', 'Review them, then save to apply.')
                  }}
                >
                  Recalculate
                </Button>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Daily calories"
                type="number"
                value={targetDraft.caloriesGoal}
                onChange={(event) => setTargetDraft((prev) => ({ ...prev, caloriesGoal: Number(event.target.value) }))}
                suffix="kcal"
              />
              <Input
                label="Daily steps"
                type="number"
                value={targetDraft.stepsGoal}
                onChange={(event) => setTargetDraft((prev) => ({ ...prev, stepsGoal: Number(event.target.value) }))}
                suffix="steps"
              />
              <Input
                label="Daily water"
                type="number"
                step={50}
                value={targetDraft.waterGoalMl}
                onChange={(event) => setTargetDraft((prev) => ({ ...prev, waterGoalMl: Number(event.target.value) }))}
                suffix="ml"
                hint={`${round(targetDraft.waterGoalMl / 1000, 1)}L per day`}
              />
              <Input
                label="Weekly workouts"
                type="number"
                min={1}
                max={7}
                value={targetDraft.weeklyWorkouts}
                onChange={(event) => setTargetDraft((prev) => ({ ...prev, weeklyWorkouts: Number(event.target.value) }))}
                suffix="/ week"
              />
              <Input
                label="Daily active minutes"
                type="number"
                value={targetDraft.dailyMinutes}
                onChange={(event) => setTargetDraft((prev) => ({ ...prev, dailyMinutes: Number(event.target.value) }))}
                suffix="min"
              />
              <div className="flex items-end">
                <Button onClick={saveTargets} icon={<Save size={16} />} full>
                  Save targets
                </Button>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-surface2/60 p-3 text-xs text-muted">
              Current water goal on the tracker: <span className="font-bold text-ink">{round(user.profile.targets.waterGoalMl / 1000, 1)}L</span> · Weekly plan{' '}
              <span className="font-bold text-ink">{user.profile.targets.weeklyWorkouts} sessions</span>
            </div>
          </Card>

          {/* notifications */}
          <Card className="p-5">
            <SectionHeader title="Notifications" subtitle="Reminders that keep you consistent" icon={<BellRing size={18} className="text-water" />} />
            <div className="space-y-4">
              {(
                [
                  { key: 'workout', label: 'Workout reminders', description: 'Nudges you when a planned session is missing' },
                  { key: 'water', label: 'Water reminders', description: 'Alerts when hydration is behind pace' },
                  { key: 'goals', label: 'Goal achievements', description: 'Celebrates targets as they are reached' },
                  { key: 'streak', label: 'Streak reminders', description: 'Warns you before a streak lapses' },
                  { key: 'weekly', label: 'Weekly progress report', description: 'Sunday summary of your training week' },
                ] as const
              ).map((item) => (
                <Switch
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={user.settings.notifications[item.key]}
                  onChange={(next) => actions.updateSettings({ notifications: { [item.key]: next } })}
                />
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-5"
              icon={<BellRing size={16} />}
              onClick={() => {
                actions.pushNotification({
                  kind: 'workout',
                  title: "💪 It's workout time!",
                  body: `Your ${user.profile.targets.dailyMinutes} minute session is waiting.`,
                })
                toast.success('Test notification sent', 'Open the bell menu to see it.')
              }}
            >
              Send a test reminder
            </Button>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* units + privacy */}
        <Card className="p-5">
          <SectionHeader title="Units & privacy" subtitle="How numbers are shown and what is shared" icon={<ShieldCheck size={18} className="text-violet-500" />} />
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-ink2">Measurement units</p>
              <Segmented
                ariaLabel="Units"
                value={units}
                onChange={(value) => actions.updateSettings({ units: value as Units })}
                options={[
                  { value: 'metric', label: 'Metric (kg, cm)' },
                  { value: 'imperial', label: 'Imperial (lb, in)' },
                ]}
              />
            </div>
            <div className="space-y-4">
              <Switch
                label="Share activity with friends"
                description="Publish workouts to a private leaderboard"
                checked={user.settings.privacy.shareActivity}
                onChange={(next) => actions.updateSettings({ privacy: { shareActivity: next } })}
              />
              <Switch
                label="Public profile"
                description="Allow others to see your badges and streak"
                checked={user.settings.privacy.publicProfile}
                onChange={(next) => actions.updateSettings({ privacy: { publicProfile: next } })}
              />
              <Switch
                label="Anonymous analytics"
                description="Help improve workout recommendations"
                checked={user.settings.privacy.analytics}
                onChange={(next) => actions.updateSettings({ privacy: { analytics: next } })}
              />
            </div>
            <Button variant="outline" onClick={() => setPasswordOpen(true)} icon={<ShieldCheck size={16} />}>
              Change password
            </Button>
          </div>
        </Card>

        {/* data + account */}
        <Card className="p-5">
          <SectionHeader title="Data & account" subtitle="Everything is stored on this device" icon={<Trophy size={18} className="text-amber-500" />} />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface2/50 p-4">
              <div>
                <p className="text-sm font-bold">Export your data</p>
                <p className="text-xs text-muted">
                  {data.sessions.length} sessions · {data.meals.length} meals · {data.water.length} water logs
                </p>
              </div>
              <Button variant="secondary" onClick={exportData} icon={<Download size={16} />}>
                Download JSON
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface2/50 p-4">
              <div>
                <p className="text-sm font-bold">Reset training data</p>
                <p className="text-xs text-muted">Clears activity but keeps your account and goals</p>
              </div>
              <Button variant="outline" onClick={resetData} icon={<RefreshCw size={16} />}>
                Reset
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/6 p-4">
              <div>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Delete account</p>
                <p className="text-xs text-muted">Removes your profile and all records permanently</p>
              </div>
              <Button variant="danger" onClick={deleteAccount} icon={<Trash size={16} />}>
                Delete
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="secondary" onClick={logout} icon={<LogOut size={16} />}>
                Log out
              </Button>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Pencil size={12} aria-hidden />
                Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-sky-500/12 text-sky-500">
            <Droplets size={20} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold">Hydration goal</p>
            <p className="text-xs text-muted">
              {round(user.profile.targets.waterGoalMl / 1000, 1)}L per day · {percent(fitness.today.waterMl, user.profile.targets.waterGoalMl).toFixed(0)}% logged today
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/water')}>
          Open water tracker
        </Button>
      </Card>

      <p className="pb-2 text-center text-xs text-muted">
        Pulse v1.0 · Built as a production-style demo · All data is stored locally in your browser
      </p>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        description="Choose something strong and unique."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={changePassword} icon={<ShieldCheck size={16} />}>
              Update password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={passwordForm.current}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, current: event.target.value }))}
            error={passwordErrors.current}
          />
          <Input
            label="New password"
            type="password"
            value={passwordForm.next}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))}
            error={passwordErrors.next}
            hint="At least 8 characters"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={passwordForm.confirm}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))}
            error={passwordErrors.confirm}
          />
          <ProgressBar value={percent(passwordForm.next.length, 12)} tone={passwordForm.next.length >= 8 ? 'brand' : 'amber'} size="sm" label="Password strength" />
        </div>
      </Modal>
    </div>
  )
}
