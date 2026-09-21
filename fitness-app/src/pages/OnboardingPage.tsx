import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BicepsFlexed,
  Briefcase,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  Home,
  PartyPopper,
  Scale,
  Sparkles,
  Target,
  TreePine,
  Trophy,
  Zap,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Field'
import { Switch } from '../components/ui/Switch'
import { useToast } from '../components/ui/Toast'
import { useApp } from '../store/AppStore'
import { ACTIVITY_META, GOAL_META, calcTargets } from '../lib/fitness'
import type { ActivityLevel, Experience, FitnessGoal, Gender, WorkoutPlace } from '../lib/types'
import { cn, formatHeight, formatWeight } from '../lib/utils'
import { AppLogo } from '../components/layout/Sidebar'

const STEPS = ['About you', 'Your goal', 'Activity', 'Experience', 'Preference'] as const

const GOAL_OPTIONS: FitnessGoal[] = [
  'lose-weight',
  'build-muscle',
  'maintain-weight',
  'improve-fitness',
  'increase-strength',
  'improve-endurance',
]

const GOAL_ICONS: Record<FitnessGoal, typeof Target> = {
  'lose-weight': Flame,
  'build-muscle': BicepsFlexed,
  'maintain-weight': Scale,
  'improve-fitness': Sparkles,
  'increase-strength': Trophy,
  'improve-endurance': Gauge,
}

const ACTIVITY_ICONS: Record<ActivityLevel, typeof Target> = {
  sedentary: Briefcase,
  light: Footprints,
  moderate: Dumbbell,
  very: Zap,
}

const PLACE_OPTIONS: { key: WorkoutPlace; label: string; blurb: string; icon: typeof Home }[] = [
  { key: 'gym', label: 'Gym', blurb: 'Barbells, machines and racks', icon: Dumbbell },
  { key: 'home', label: 'Home', blurb: 'Bodyweight and small equipment', icon: Home },
  { key: 'outdoor', label: 'Outdoor', blurb: 'Running, hiking and parks', icon: TreePine },
]

export default function OnboardingPage() {
  const { user, actions } = useApp()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const committed = useRef(false)
  const [seedSample, setSeedSample] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    name: user?.name ?? '',
    age: 28,
    gender: 'male' as Gender,
    heightCm: 175,
    weightKg: 74,
    goal: 'lose-weight' as FitnessGoal,
    activityLevel: 'moderate' as ActivityLevel,
    experience: 'beginner' as Experience,
    place: 'home' as WorkoutPlace,
  })

  const targets = useMemo(
    () => calcTargets({ ...form }),
    [form],
  )

  if (!user) return null

  const validateStep = () => {
    if (step === 0) {
      const next: Record<string, string> = {}
      if (form.name.trim().length < 2) next.name = 'Please tell us your name.'
      if (form.age < 12 || form.age > 90) next.age = 'Enter an age between 12 and 90.'
      if (form.heightCm < 120 || form.heightCm > 230) next.heightCm = 'Enter a height between 120 and 230 cm.'
      if (form.weightKg < 35 || form.weightKg > 250) next.weightKg = 'Enter a weight between 35 and 250 kg.'
      setErrors(next)
      return Object.keys(next).length === 0
    }
    return true
  }

  const next = () => {
    if (!validateStep()) return
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }
  const back = () => setStep((prev) => Math.max(prev - 1, 0))

  const finish = () => {
    if (!committed.current) {
      actions.completeOnboarding(
        {
          age: form.age,
          gender: form.gender,
          heightCm: form.heightCm,
          weightKg: form.weightKg,
          goal: form.goal,
          activityLevel: form.activityLevel,
          experience: form.experience,
          place: form.place,
          // onboarding is only marked complete once the user lands on the dashboard
          onboarded: false,
          targets: user.profile.targets,
        },
        seedSample,
      )
      committed.current = true
    } else {
      actions.updateProfile({
        age: form.age,
        gender: form.gender,
        heightCm: form.heightCm,
        weightKg: form.weightKg,
        goal: form.goal,
        activityLevel: form.activityLevel,
        experience: form.experience,
        place: form.place,
      })
    }
    if (form.name.trim() !== user.name) actions.updateUser({ name: form.name.trim() })
    setDone(true)
    toast.success('Profile ready', 'Your targets have been personalised.')
  }

  const goToDashboard = () => {
    actions.updateProfile({ onboarded: true })
    navigate('/dashboard')
  }

  if (done) {
    return (
      <div className="grid min-h-dvh place-items-center bg-page px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
          <Card className="overflow-hidden">
            <div className="relative bg-gradient-to-br from-emerald-500/25 via-emerald-500/10 to-transparent px-6 py-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-emerald-500 text-emerald-950">
                <PartyPopper size={26} aria-hidden />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">
                You’re all set, {form.name.split(' ')[0]}!
              </h1>
              <p className="mt-2 text-sm text-muted">
                Targets built from your body stats, goal and activity level. You can fine-tune everything later in Profile.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
              {[
                { label: 'Calories / day', value: `${targets.caloriesGoal}`, unit: 'kcal', icon: Flame },
                { label: 'Steps / day', value: targets.stepsGoal.toLocaleString('en-US'), unit: '', icon: Footprints },
                { label: 'Water / day', value: `${(targets.waterGoalMl / 1000).toFixed(1)}`, unit: 'L', icon: Scale },
                { label: 'Workouts / week', value: `${targets.weeklyWorkouts}`, unit: '', icon: Dumbbell },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-line bg-surface2/60 p-3.5 text-center">
                  <item.icon size={18} className="mx-auto text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <p className="mt-2 font-display text-xl font-extrabold tabular-nums">
                    {item.value}
                    <span className="text-sm font-semibold text-muted">{item.unit}</span>
                  </p>
                  <p className="text-[11px] font-semibold text-muted">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-line px-6 py-5 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setDone(false)} icon={<ArrowLeft size={16} />}>
                Adjust answers
              </Button>
              <Button size="lg" onClick={goToDashboard} icon={<ArrowRight size={18} />}>
                Go to my dashboard
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-page px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <AppLogo />
          <span className="text-sm font-semibold text-muted">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-surface3">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted">
          {STEPS.map((label, index) => (
            <span key={label} className={cn('flex items-center gap-1', index <= step && 'text-emerald-600 dark:text-emerald-400')}>
              {index < step ? <Check size={12} aria-hidden /> : null}
              {label}
              {index < STEPS.length - 1 ? <span className="text-muted/50">·</span> : null}
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6"
          >
            {step === 0 ? (
              <Card className="p-5 sm:p-7">
                <h1 className="font-display text-2xl font-extrabold">Tell us about you</h1>
                <p className="mt-1 text-sm text-muted">
                  We use these numbers to calculate your BMR, calorie target and body-fat estimate.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    error={errors.name}
                    required
                  />
                  <Input
                    label="Age"
                    type="number"
                    min={12}
                    max={90}
                    value={form.age}
                    onChange={(event) => setForm((prev) => ({ ...prev, age: Number(event.target.value) }))}
                    error={errors.age}
                    suffix="years"
                    required
                  />
                  <Select
                    label="Gender"
                    value={form.gender}
                    onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value as Gender }))}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Prefer not to say</option>
                  </Select>
                  <Input
                    label="Height"
                    type="number"
                    min={120}
                    max={230}
                    value={form.heightCm}
                    onChange={(event) => setForm((prev) => ({ ...prev, heightCm: Number(event.target.value) }))}
                    error={errors.heightCm}
                    suffix="cm"
                    hint={formatHeight(form.heightCm, 'imperial')}
                    required
                  />
                  <Input
                    label="Weight"
                    type="number"
                    min={35}
                    max={250}
                    step="0.1"
                    value={form.weightKg}
                    onChange={(event) => setForm((prev) => ({ ...prev, weightKg: Number(event.target.value) }))}
                    error={errors.weightKg}
                    suffix="kg"
                    hint={formatWeight(form.weightKg, 'imperial')}
                    required
                  />
                </div>
              </Card>
            ) : null}

            {step === 1 ? (
              <Card className="p-5 sm:p-7">
                <h1 className="font-display text-2xl font-extrabold">What’s your main goal?</h1>
                <p className="mt-1 text-sm text-muted">This shapes your calorie target, macros and recommended workouts.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {GOAL_OPTIONS.map((goal) => {
                    const meta = GOAL_META[goal]
                    const Icon = GOAL_ICONS[goal]
                    const active = form.goal === goal
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, goal }))}
                        aria-pressed={active}
                        className={cn(
                          'flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
                          active
                            ? 'border-emerald-500 bg-emerald-500/8 shadow-soft'
                            : 'border-line bg-surface2/50 hover:border-linestrong hover:bg-surface2',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-10 shrink-0 place-items-center rounded-xl',
                            active ? 'bg-emerald-500 text-emerald-950' : 'bg-surface3 text-ink2',
                          )}
                        >
                          <Icon size={19} aria-hidden />
                        </span>
                        <span>
                          <span className="block text-sm font-bold">{meta.label}</span>
                          <span className="mt-0.5 block text-xs text-muted">{meta.blurb}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            ) : null}

            {step === 2 ? (
              <Card className="p-5 sm:p-7">
                <h1 className="font-display text-2xl font-extrabold">How active are you?</h1>
                <p className="mt-1 text-sm text-muted">Day-to-day activity outside of training, on average.</p>
                <div className="mt-6 space-y-3">
                  {(['sedentary', 'light', 'moderate', 'very'] as ActivityLevel[]).map((level) => {
                    const meta = ACTIVITY_META[level]
                    const Icon = ACTIVITY_ICONS[level]
                    const active = form.activityLevel === level
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, activityLevel: level }))}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
                          active ? 'border-emerald-500 bg-emerald-500/8' : 'border-line bg-surface2/50 hover:bg-surface2',
                        )}
                      >
                        <span className={cn('grid size-10 place-items-center rounded-xl', active ? 'bg-emerald-500 text-emerald-950' : 'bg-surface3 text-ink2')}>
                          <Icon size={19} aria-hidden />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-bold">{meta.label}</span>
                          <span className="text-xs text-muted">{meta.blurb}</span>
                        </span>
                        {active ? <Check size={18} className="text-emerald-600 dark:text-emerald-400" aria-hidden /> : null}
                      </button>
                    )
                  })}
                </div>
              </Card>
            ) : null}

            {step === 3 ? (
              <Card className="p-5 sm:p-7">
                <h1 className="font-display text-2xl font-extrabold">Your training experience</h1>
                <p className="mt-1 text-sm text-muted">We match workout difficulty and volume to this.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {([
                    { key: 'beginner', label: 'Beginner', blurb: 'New to training or returning after a break' },
                    { key: 'intermediate', label: 'Intermediate', blurb: 'Training consistently for 6+ months' },
                    { key: 'advanced', label: 'Advanced', blurb: 'Years of structured training' },
                  ] as { key: Experience; label: string; blurb: string }[]).map((option) => {
                    const active = form.experience === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, experience: option.key }))}
                        aria-pressed={active}
                        className={cn(
                          'rounded-2xl border p-4 text-left transition-all duration-200',
                          active ? 'border-emerald-500 bg-emerald-500/8' : 'border-line bg-surface2/50 hover:bg-surface2',
                        )}
                      >
                        <span className="block text-sm font-bold">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted">{option.blurb}</span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            ) : null}

            {step === 4 ? (
              <Card className="p-5 sm:p-7">
                <h1 className="font-display text-2xl font-extrabold">Where do you like to train?</h1>
                <p className="mt-1 text-sm text-muted">We’ll prioritise workouts that fit your setup.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {PLACE_OPTIONS.map((option) => {
                    const active = form.place === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, place: option.key }))}
                        aria-pressed={active}
                        className={cn(
                          'rounded-2xl border p-4 text-left transition-all duration-200',
                          active ? 'border-emerald-500 bg-emerald-500/8' : 'border-line bg-surface2/50 hover:bg-surface2',
                        )}
                      >
                        <option.icon size={19} className={active ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink2'} aria-hidden />
                        <span className="mt-2 block text-sm font-bold">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted">{option.blurb}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-6 rounded-2xl border border-line bg-surface2/60 p-4">
                  <Switch
                    checked={seedSample}
                    onChange={setSeedSample}
                    label="Populate my account with sample activity"
                    description="Great for exploring charts, streaks and achievements right away. You can wipe it later from Profile → Data."
                    tone="brand"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Calories', value: `${targets.caloriesGoal}`, unit: 'kcal' },
                    { label: 'Steps', value: targets.stepsGoal.toLocaleString('en-US'), unit: '' },
                    { label: 'Water', value: (targets.waterGoalMl / 1000).toFixed(1), unit: 'L' },
                    { label: 'Sessions', value: `${targets.weeklyWorkouts}`, unit: '/week' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-surface2/70 p-3 text-center">
                      <p className="font-display text-lg font-extrabold tabular-nums">
                        {item.value}
                        <span className="text-xs font-semibold text-muted">{item.unit}</span>
                      </p>
                      <p className="text-[11px] font-semibold text-muted">{item.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={back} disabled={step === 0} icon={<ArrowLeft size={16} />}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="lg" onClick={next} icon={<ArrowRight size={18} />}>
              Continue
            </Button>
          ) : (
            <Button size="lg" onClick={finish} icon={<Check size={18} />}>
              Finish setup
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
