import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  as?: 'div' | 'section' | 'article' | 'li'
}

export function Card({ children, className, hover, as = 'div' }: CardProps) {
  const Tag = as
  return <Tag className={cn('card', hover && 'card-hover', className)}>{children}</Tag>
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, action, icon, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="flex items-center gap-3">
        {icon ? <span className="grid size-10 place-items-center rounded-2xl bg-surface2 text-ink2">{icon}</span> : null}
        <div>
          <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}
