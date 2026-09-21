import { Zap } from 'lucide-react'

export function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-page">
      <div className="flex flex-col items-center gap-4">
        <span className="relative grid size-16 place-items-center rounded-3xl bg-emerald-500 text-emerald-950">
          <span className="absolute inset-0 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-3xl bg-emerald-500/50" aria-hidden />
          <Zap size={28} strokeWidth={2.6} aria-hidden />
        </span>
        <div className="text-center">
          <p className="font-display text-xl font-extrabold">Pulse</p>
          <p className="text-sm text-muted">Loading your training data…</p>
        </div>
      </div>
    </div>
  )
}
