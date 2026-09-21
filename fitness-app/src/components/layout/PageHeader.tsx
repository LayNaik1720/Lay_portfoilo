import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

export function PageHeader({
  title,
  subtitle,
  action,
  backTo,
  backLabel,
  className,
}: {
  /** omit when the page renders its own headline elsewhere */
  title?: string
  subtitle?: string
  action?: ReactNode
  backTo?: string
  backLabel?: string
  className?: string
}) {
  return (
    <header className={cn('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft size={16} aria-hidden />
            {backLabel ?? 'Back'}
          </Link>
        ) : null}
        {title ? <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">{title}</h1> : null}
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{action}</div> : null}
    </header>
  )
}
