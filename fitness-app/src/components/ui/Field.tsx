import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../../lib/utils'

const CONTROL =
  'w-full rounded-2xl border bg-surface2 px-4 text-ink placeholder:text-muted/70 transition-colors duration-200 ' +
  'focus:border-emerald-500/60 focus:bg-surface focus:outline-none focus-visible:outline-none'

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  htmlFor?: string
  className?: string
}

export function Field({ label, hint, error, required, children, htmlFor, className }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="flex items-center gap-1 text-sm font-semibold text-ink2">
          {label}
          {required ? <span className="text-rose-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-500" role="alert">
          <CircleAlert size={13} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, suffix, className, id, ...rest },
  ref,
) {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">{icon}</span> : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            CONTROL,
            'h-12',
            icon && 'pl-11',
            suffix && 'pr-16',
            error ? 'border-rose-500/60' : 'border-line',
            className,
          )}
          {...rest}
        />
        {suffix ? <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">{suffix}</span> : null}
      </div>
    </Field>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const generated = useId()
  const selectId = id ?? generated
  return (
    <Field label={label} hint={hint} error={error} htmlFor={selectId}>
      <select
        ref={ref}
        id={selectId}
        className={cn(CONTROL, 'h-12 appearance-none pr-10', error ? 'border-rose-500/60' : 'border-line', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.85rem center',
          backgroundSize: '1.1rem',
        }}
        {...rest}
      >
        {children}
      </select>
    </Field>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const generated = useId()
  const textAreaId = id ?? generated
  return (
    <Field label={label} hint={hint} error={error} htmlFor={textAreaId}>
      <textarea
        ref={ref}
        id={textAreaId}
        className={cn(CONTROL, 'min-h-24 resize-y py-3', error ? 'border-rose-500/60' : 'border-line', className)}
        {...rest}
      />
    </Field>
  )
})
