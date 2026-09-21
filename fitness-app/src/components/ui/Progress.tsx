import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { TONES, type Tone } from './tokens'

interface ProgressRingProps {
  /** 0 – 100 */
  value: number
  size?: number
  stroke?: number
  tone?: Tone
  trackClassName?: string
  children?: ReactNode
  className?: string
  /** slow sweep animation when the ring mounts */
  animate?: boolean
  label?: string
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 11,
  tone = 'brand',
  children,
  className,
  animate = true,
  label,
}: ProgressRingProps) {
  const [shown, setShown] = useState(animate ? 0 : value)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))

  useEffect(() => {
    if (!animate) {
      setShown(clamped)
      return
    }
    const frame = requestAnimationFrame(() => setShown(clamped))
    return () => cancelAnimationFrame(frame)
  }, [clamped, animate])

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label ?? `${Math.round(clamped)} percent complete`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={TONES[tone].hex}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (shown / 100) * circumference}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function ProgressBar({
  value,
  tone = 'brand',
  size = 'md',
  className,
  showValue,
  label,
}: {
  value: number
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showValue?: boolean
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn('w-full overflow-hidden rounded-full bg-surface3', heights[size])}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%`, background: TONES[tone].hex }}
        />
      </div>
      {showValue ? <span className="w-10 shrink-0 text-right text-xs font-semibold text-muted tabular-nums">{Math.round(clamped)}%</span> : null}
    </div>
  )
}
