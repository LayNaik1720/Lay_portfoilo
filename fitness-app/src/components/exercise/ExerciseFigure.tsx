/* ------------------------------------------------------------------
   Exercise Visuals — lightweight animated SVG athletes.

   Each exercise maps to a "pose" made of limbs; every limb can carry a
   motion so the figure actually performs the movement. This keeps the
   bundle tiny (no video assets) while still showing the user what to do.
------------------------------------------------------------------ */
import { cn } from '../../lib/utils'
import { TONES, type Tone } from '../ui/tokens'
import type { PoseKey } from '../../lib/types'

type Motion = 'still' | 'swing' | 'lift' | 'cycle' | 'press' | 'bob' | 'squeeze'

interface Limb {
  points: [number, number][]
  motion: Motion
  delay?: number
}

interface PoseDef {
  head: [number, number]
  spine: [number, number][]
  arms: Limb[]
  legs: Limb[]
}

const g = (x: number, y: number): [number, number] => [x, y]

/** Horizontal body (push-ups, planks) helper */
const horizontal = (): PoseDef => ({
  head: g(22, 46),
  spine: [g(32, 46), g(78, 56)],
  arms: [
    { points: [g(38, 47), g(30, 60), g(28, 72)], motion: 'lift' },
    { points: [g(38, 47), g(46, 60), g(50, 72)], motion: 'lift', delay: 0.1 },
  ],
  legs: [
    { points: [g(78, 56), g(92, 66), g(104, 72)], motion: 'still' },
    { points: [g(78, 58), g(94, 68), g(104, 74)], motion: 'still', delay: 0.1 },
  ],
})

export const POSES: Record<PoseKey, PoseDef> = {
  pushup: horizontal(),
  plank: {
    head: g(22, 48),
    spine: [g(32, 48), g(76, 58)],
    arms: [
      { points: [g(38, 49), g(30, 62), g(28, 74)], motion: 'still' },
      { points: [g(38, 49), g(46, 62), g(50, 74)], motion: 'still', delay: 0.1 },
    ],
    legs: [
      { points: [g(76, 58), g(92, 66), g(106, 72)], motion: 'still' },
      { points: [g(76, 60), g(94, 68), g(106, 74)], motion: 'still', delay: 0.1 },
    ],
  },
  squat: {
    head: g(60, 20),
    spine: [g(60, 30), g(60, 48)],
    arms: [
      { points: [g(60, 32), g(48, 42), g(56, 52)], motion: 'lift' },
      { points: [g(60, 32), g(72, 42), g(64, 52)], motion: 'lift', delay: 0.08 },
    ],
    legs: [
      { points: [g(60, 48), g(44, 62), g(50, 78)], motion: 'cycle' },
      { points: [g(60, 48), g(76, 62), g(70, 78)], motion: 'cycle', delay: 0.08 },
    ],
  },
  lunge: {
    head: g(58, 20),
    spine: [g(58, 30), g(58, 48)],
    arms: [
      { points: [g(58, 32), g(46, 44), g(50, 56)], motion: 'swing' },
      { points: [g(58, 32), g(70, 44), g(66, 56)], motion: 'swing', delay: 0.1 },
    ],
    legs: [
      { points: [g(58, 48), g(42, 60), g(38, 76)], motion: 'cycle' },
      { points: [g(58, 48), g(74, 62), g(86, 72)], motion: 'cycle', delay: 0.1 },
    ],
  },
  climber: {
    head: g(24, 44),
    spine: [g(34, 46), g(80, 56)],
    arms: [
      { points: [g(40, 47), g(32, 60), g(30, 72)], motion: 'still' },
      { points: [g(40, 47), g(48, 60), g(52, 72)], motion: 'still', delay: 0.1 },
    ],
    legs: [
      { points: [g(80, 56), g(70, 66), g(58, 68)], motion: 'cycle' },
      { points: [g(80, 58), g(94, 68), g(104, 74)], motion: 'cycle', delay: 0.35 },
    ],
  },
  jump: {
    head: g(60, 18),
    spine: [g(60, 28), g(60, 46)],
    arms: [
      { points: [g(60, 30), g(46, 22), g(44, 10)], motion: 'press' },
      { points: [g(60, 30), g(74, 22), g(76, 10)], motion: 'press', delay: 0.08 },
    ],
    legs: [
      { points: [g(60, 46), g(52, 58), g(48, 72)], motion: 'cycle' },
      { points: [g(60, 46), g(68, 58), g(72, 72)], motion: 'cycle', delay: 0.08 },
    ],
  },
  jumpjack: {
    head: g(60, 18),
    spine: [g(60, 28), g(60, 46)],
    arms: [
      { points: [g(60, 30), g(42, 34), g(24, 26)], motion: 'press' },
      { points: [g(60, 30), g(78, 34), g(96, 26)], motion: 'press', delay: 0.06 },
    ],
    legs: [
      { points: [g(60, 46), g(46, 62), g(30, 74)], motion: 'swing' },
      { points: [g(60, 46), g(74, 62), g(90, 74)], motion: 'swing', delay: 0.06 },
    ],
  },
  curl: {
    head: g(60, 20),
    spine: [g(60, 30), g(60, 50)],
    arms: [
      { points: [g(60, 32), g(48, 44), g(52, 32)], motion: 'squeeze' },
      { points: [g(60, 32), g(72, 44), g(68, 32)], motion: 'squeeze', delay: 0.08 },
    ],
    legs: [
      { points: [g(60, 50), g(52, 64), g(52, 78)], motion: 'still' },
      { points: [g(60, 50), g(68, 64), g(68, 78)], motion: 'still', delay: 0.06 },
    ],
  },
  press: {
    head: g(60, 20),
    spine: [g(60, 30), g(60, 50)],
    arms: [
      { points: [g(60, 32), g(46, 26), g(48, 8)], motion: 'press' },
      { points: [g(60, 32), g(74, 26), g(72, 8)], motion: 'press', delay: 0.08 },
    ],
    legs: [
      { points: [g(60, 50), g(52, 64), g(52, 78)], motion: 'still' },
      { points: [g(60, 50), g(68, 64), g(68, 78)], motion: 'still', delay: 0.06 },
    ],
  },
  run: {
    head: g(60, 18),
    spine: [g(60, 28), g(62, 48)],
    arms: [
      { points: [g(60, 30), g(46, 36), g(44, 22)], motion: 'cycle' },
      { points: [g(60, 30), g(74, 38), g(80, 26)], motion: 'cycle', delay: 0.3 },
    ],
    legs: [
      { points: [g(62, 48), g(48, 58), g(40, 70)], motion: 'cycle' },
      { points: [g(62, 48), g(76, 56), g(84, 68)], motion: 'cycle', delay: 0.3 },
    ],
  },
  bridge: {
    head: g(30, 58),
    spine: [g(38, 54), g(74, 46)],
    arms: [
      { points: [g(40, 56), g(30, 66), g(22, 74)], motion: 'still' },
      { points: [g(44, 56), g(34, 68), g(26, 74)], motion: 'still', delay: 0.08 },
    ],
    legs: [
      { points: [g(74, 46), g(84, 60), g(78, 74)], motion: 'lift' },
      { points: [g(74, 48), g(88, 60), g(84, 74)], motion: 'lift', delay: 0.1 },
    ],
  },
  twist: {
    head: g(60, 26),
    spine: [g(60, 36), g(58, 54)],
    arms: [
      { points: [g(58, 38), g(40, 42), g(36, 34)], motion: 'swing' },
      { points: [g(58, 38), g(76, 42), g(80, 34)], motion: 'swing', delay: 0.25 },
    ],
    legs: [
      { points: [g(58, 54), g(46, 64), g(40, 74)], motion: 'still' },
      { points: [g(58, 54), g(76, 62), g(84, 70)], motion: 'still', delay: 0.08 },
    ],
  },
  stretch: {
    head: g(52, 34),
    spine: [g(56, 42), g(72, 52)],
    arms: [
      { points: [g(58, 44), g(44, 46), g(30, 50)], motion: 'lift' },
      { points: [g(58, 46), g(44, 50), g(30, 56)], motion: 'lift', delay: 0.12 },
    ],
    legs: [
      { points: [g(72, 52), g(88, 58), g(102, 64)], motion: 'still' },
      { points: [g(72, 54), g(90, 62), g(104, 70)], motion: 'still', delay: 0.08 },
    ],
  },
  row: {
    head: g(46, 26),
    spine: [g(50, 34), g(70, 48)],
    arms: [
      { points: [g(52, 34), g(44, 46), g(54, 50)], motion: 'squeeze' },
      { points: [g(54, 36), g(48, 48), g(58, 54)], motion: 'squeeze', delay: 0.1 },
    ],
    legs: [
      { points: [g(70, 48), g(80, 62), g(78, 76)], motion: 'still' },
      { points: [g(70, 50), g(84, 64), g(84, 78)], motion: 'still', delay: 0.08 },
    ],
  },
  swing: {
    head: g(50, 24),
    spine: [g(54, 32), g(74, 46)],
    arms: [
      { points: [g(56, 34), g(48, 46), g(38, 40)], motion: 'press' },
      { points: [g(58, 36), g(52, 48), g(42, 44)], motion: 'press', delay: 0.08 },
    ],
    legs: [
      { points: [g(74, 46), g(82, 62), g(80, 76)], motion: 'lift' },
      { points: [g(74, 48), g(86, 64), g(86, 78)], motion: 'lift', delay: 0.08 },
    ],
  },
  pullup: {
    head: g(60, 30),
    spine: [g(60, 38), g(60, 56)],
    arms: [
      { points: [g(60, 40), g(44, 30), g(40, 14)], motion: 'lift' },
      { points: [g(60, 40), g(76, 30), g(80, 14)], motion: 'lift', delay: 0.1 },
    ],
    legs: [
      { points: [g(60, 56), g(54, 68), g(50, 78)], motion: 'swing' },
      { points: [g(60, 56), g(66, 68), g(70, 78)], motion: 'swing', delay: 0.12 },
    ],
  },
}

const MOTION_STYLE: Record<Motion, { animation: string; duration: string }> = {
  still: { animation: 'none', duration: '0s' },
  swing: { animation: 'fig-swing', duration: '2.2s' },
  lift: { animation: 'fig-lift', duration: '1.9s' },
  cycle: { animation: 'fig-cycle', duration: '1.5s' },
  press: { animation: 'fig-press', duration: '2.1s' },
  bob: { animation: 'fig-lift', duration: '2.4s' },
  squeeze: { animation: 'fig-squeeze', duration: '1.7s' },
}

interface ExerciseFigureProps {
  pose: PoseKey
  tone?: Tone
  className?: string
  /** pause the animation (used by the player when paused) */
  paused?: boolean
  label?: string
}

export function ExerciseFigure({ pose, tone = 'brand', className, paused, label }: ExerciseFigureProps) {
  const definition = POSES[pose] ?? POSES.squat
  const styles = TONES[tone]
  const color = styles.hex

  const renderLimb = (limb: Limb, index: number, kind: 'arm' | 'leg') => {
    const motion = MOTION_STYLE[limb.motion]
    const [ox, oy] = limb.points[0]
    return (
      <polyline
        key={`${kind}-${index}`}
        points={limb.points.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={kind === 'arm' ? 5 : 6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={kind === 'arm' ? 0.85 : 1}
        style={{
          transformOrigin: `${ox}px ${oy}px`,
          animationName: paused || motion.animation === 'none' ? 'none' : motion.animation,
          animationDuration: motion.duration,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: `${limb.delay ?? 0}s`,
        }}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 120 90"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={label ?? `${pose} exercise demonstration`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`fig-bg-${pose}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="90" rx="16" fill={`url(#fig-bg-${pose})`} />
      <line x1="8" y1="80" x2="112" y2="80" stroke={color} strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
      <g
        style={{
          animationName: paused ? 'none' : 'fig-body',
          animationDuration: '3.4s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
      >
        <circle cx={definition.head[0]} cy={definition.head[1]} r="7.5" fill={color} />
        <polyline
          points={definition.spine.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
        {definition.arms.map((limb, index) => renderLimb(limb, index, 'arm'))}
        {definition.legs.map((limb, index) => renderLimb(limb, index, 'leg'))}
      </g>
    </svg>
  )
}

export function FigureFrame({
  pose,
  tone = 'brand',
  className,
  paused,
  label,
  caption,
  aspect = 'aspect-[4/3]',
}: {
  pose: PoseKey
  tone?: Tone
  className?: string
  paused?: boolean
  label?: string
  caption?: string
  aspect?: string
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-line bg-surface2', aspect, className)}>
      <div className="absolute inset-0 p-4">
        <ExerciseFigure pose={pose} tone={tone} paused={paused} label={label} />
      </div>
      {caption ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold text-ink2 backdrop-blur">
          {caption}
        </span>
      ) : null}
    </div>
  )
}
