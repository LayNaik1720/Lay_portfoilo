import { NavLink } from 'react-router-dom'
import { MOBILE_NAV } from './navigation'
import { cn } from '../../lib/utils'

export function BottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/92 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1.5 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {MOBILE_NAV.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition-colors duration-200',
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-xl transition-all duration-250',
                      isActive && 'bg-emerald-500/12',
                    )}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                  </span>
                  {item.mobileLabel ?? item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
