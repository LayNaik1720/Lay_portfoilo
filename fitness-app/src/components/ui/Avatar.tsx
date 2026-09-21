import { cn, initials } from '../../lib/utils'

export function Avatar({
  name,
  color = '#10B981',
  url,
  size = 40,
  className,
  ring,
}: {
  name: string
  color?: string
  url?: string
  size?: number
  className?: string
  ring?: boolean
}) {
  const style = { width: size, height: size }
  if (url) {
    return (
      <img
        src={url}
        alt={`${name}'s profile photo`}
        style={style}
        className={cn('rounded-full object-cover', ring && 'ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-surface', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: `linear-gradient(145deg, ${color}, ${color}bb)`, fontSize: size * 0.38 }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold text-emerald-950 select-none',
        ring && 'ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-surface',
        className,
      )}
    >
      {initials(name) || '?'}
    </span>
  )
}
