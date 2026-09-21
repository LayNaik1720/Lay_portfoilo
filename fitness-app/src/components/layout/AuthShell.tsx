import type { ReactNode } from 'react'
import { Activity, Droplets, Flame, Trophy, Zap } from 'lucide-react'

const HIGHLIGHTS = [
  { icon: Flame, tone: 'text-orange-400', label: 'Calories, macros & meals' },
  { icon: Droplets, tone: 'text-sky-400', label: 'Hydration tracking with goals' },
  { icon: Activity, tone: 'text-emerald-400', label: 'Guided workout player' },
  { icon: Trophy, tone: 'text-amber-400', label: 'Streaks & achievements' },
]

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* form column */}
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 text-emerald-950">
              <Zap size={22} strokeWidth={2.6} aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="font-display text-xl font-extrabold tracking-tight">Pulse</p>
              <p className="text-xs text-muted">Fitness & Workout Tracker</p>
            </div>
          </div>

          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted sm:text-base">{subtitle}</p>

          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </div>
      </main>

      {/* brand column */}
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src="/img/cover-fullbody.jpg"
          alt="Athlete training with a kettlebell in a dark gym"
          className="absolute inset-0 size-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/95 via-[#04140e]/85 to-black/60" />
        <div className="relative flex h-full flex-col justify-end gap-6 p-12 text-white">
          <div className="max-w-md">
            <p className="text-sm font-bold tracking-widest text-emerald-300 uppercase">Train with intent</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight">
              Every rep, every litre, every step — tracked in one place.
            </h2>
            <p className="mt-3 text-sm text-white/75">
              Pulse turns daily habits into visible progress with personalised targets built from your body stats, goal and
              activity level.
            </p>
          </div>

          <ul className="grid max-w-md grid-cols-2 gap-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 rounded-2xl border border-white/12 bg-white/6 px-3.5 py-3 backdrop-blur-sm">
                <item.icon size={18} className={item.tone} aria-hidden />
                <span className="text-xs font-semibold text-white/90">{item.label}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-6 border-t border-white/12 pt-6">
            <div>
              <p className="font-display text-2xl font-extrabold">30+</p>
              <p className="text-xs text-white/70">Guided workouts</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold">75</p>
              <p className="text-xs text-white/70">Exercises</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold">100%</p>
              <p className="text-xs text-white/70">Offline, stored locally</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
