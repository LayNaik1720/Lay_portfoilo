import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 active:bg-emerald-600 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.8)] disabled:hover:bg-emerald-500',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700',
  secondary: 'bg-surface2 text-ink hover:bg-surface3 border border-line',
  outline: 'border border-linestrong text-ink hover:bg-surface2',
  ghost: 'text-ink2 hover:bg-surface2 hover:text-ink',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4.5 text-sm gap-2 rounded-2xl',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl justify-center',
}

const BASE =
  'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/60 ' +
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, full, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(BASE, VARIANTS[variant], SIZES[size], full && 'w-full', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

export interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  full?: boolean
}

export function LinkButton({ variant = 'primary', size = 'md', icon, full, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], full && 'w-full', className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
