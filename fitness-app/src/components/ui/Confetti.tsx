import { useMemo } from 'react'

const COLORS = ['#10B981', '#34D399', '#F97316', '#38BDF8', '#A855F7', '#F5B301']

/** Lightweight CSS confetti — used for workout completion and streak celebrations. */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.6 + Math.random() * 1.8,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        drift: `${Math.round((Math.random() - 0.5) * 160)}px`,
        rounded: Math.random() > 0.5,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-150 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * (piece.rounded ? 1 : 1.6),
            background: piece.color,
            borderRadius: piece.rounded ? '999px' : '2px',
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
            ['--dx' as string]: piece.drift,
          }}
          className="absolute top-0 block"
        />
      ))}
    </div>
  )
}
