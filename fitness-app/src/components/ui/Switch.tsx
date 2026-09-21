import { cn } from '../../lib/utils'
import { TONES, type Tone } from './tokens'

export function Switch({
  checked,
  onChange,
  label,
  description,
  tone = 'brand',
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
  description?: string
  tone?: Tone
  disabled?: boolean
}) {
  const id = label ? `switch-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined
  return (
    <div className="flex items-start justify-between gap-4">
      {label ? (
        <label htmlFor={id} className="flex-1 cursor-pointer">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6.5 w-11.5 shrink-0 rounded-full border transition-colors duration-250',
          checked ? cn(TONES[tone].solid, 'border-transparent') : 'border-line bg-surface3',
          disabled && 'opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all duration-250',
            checked ? 'left-6' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}
