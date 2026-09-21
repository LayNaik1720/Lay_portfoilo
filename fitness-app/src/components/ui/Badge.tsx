import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { DIFFICULTY_TONE, TONES, type Tone } from './tokens'

export function Badge({
  children,
  tone = 'neutral',
  className,
  icon,
  solid,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  icon?: ReactNode
  solid?: boolean
}) {
  const style = TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        solid ? style.solid : cn(style.soft, style.text),
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

export function DifficultyBadge({ level, className }: { level: string; className?: string }) {
  return (
    <Badge tone={DIFFICULTY_TONE[level] ?? 'neutral'} className={className}>
      {level}
    </Badge>
  )
}

export function Chip({
  active,
  children,
  onClick,
  className,
  ariaPressed,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  className?: string
  ariaPressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all duration-200',
        active
          ? 'border-emerald-500 bg-emerald-500 text-emerald-950'
          : 'border-line bg-surface text-ink2 hover:border-linestrong hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
