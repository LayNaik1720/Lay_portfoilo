import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { TONES, type Tone } from './tokens'

interface StatCardProps {
  label: string
  value: ReactNode
  unit?: string
  goal?: string
  icon: ReactNode
  tone?: Tone
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
  to?: string
  progress?: number
  onClick?: () => void
  className?: string
}

export function StatCard({ label, value, unit, goal, icon, tone = 'brand', trend, to, progress, onClick, className }: StatCardProps) {
  const styles = TONES[tone]

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={cn('grid size-10 place-items-center rounded-2xl', styles.soft, styles.text)} aria-hidden>
          {icon}
        </span>
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold',
              trend.direction === 'up' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface2 text-muted',
              trend.direction === 'down' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            )}
          >
            {trend.direction === 'up' ? <ArrowUpRight size={12} /> : null}
            {trend.direction === 'down' ? <ArrowDownRight size={12} /> : null}
            {trend.value}
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
        <p className="mt-1 flex items-baseline gap-1 font-display text-2xl font-bold tabular-nums sm:text-[1.7rem]">
          {value}
          {unit ? <span className="text-sm font-semibold text-muted">{unit}</span> : null}
        </p>
        {goal ? <p className="mt-1 text-xs text-muted">{goal}</p> : null}
      </div>
      {typeof progress === 'number' ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface3">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(2, Math.min(100, progress))}%`, background: styles.hex }}
          />
        </div>
      ) : null}
    </>
  )

  const className2 = cn('card card-hover block p-4 sm:p-5', className)

  if (to) {
    return (
      <Link to={to} className={className2} aria-label={`${label} details`}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className2, 'text-left')}>
        {inner}
      </button>
    )
  }
  return <div className={className2}>{inner}</div>
}
