import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, Moon, Search, Sun, Target, Trophy, User, X } from 'lucide-react'
import { useApp } from '../../store/AppStore'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { AppLogo } from './Sidebar'
import { NotificationPanel } from './NotificationPanel'
import { useConfirm } from '../ui/Confirm'
import { cn } from '../../lib/utils'

export function Topbar() {
  const { user, data, actions } = useApp()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const unread = data.notifications.filter((n) => !n.read).length
  const isDark = document.documentElement.classList.contains('dark')

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/workouts?q=${encodeURIComponent(trimmed)}` : '/workouts')
    setSearchOpen(false)
  }

  const logout = async () => {
    setMenuOpen(false)
    const ok = await confirm({
      title: 'Log out of Pulse?',
      description: 'Your progress stays saved on this device.',
      confirmLabel: 'Log out',
      tone: 'danger',
    })
    if (ok) {
      actions.logout()
      navigate('/login')
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <AppLogo compact />
          </div>

          <form onSubmit={submitSearch} className="hidden flex-1 lg:block" role="search">
            <label className="relative block max-w-md">
              <span className="sr-only">Search workouts</span>
              <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search workouts, muscles, equipment…"
                className="h-11 w-full rounded-2xl border border-line bg-surface2 pr-4 pl-11 text-sm text-ink transition-colors placeholder:text-muted/80 focus:border-emerald-500/60 focus:bg-surface focus:outline-none"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Search workouts"
              aria-expanded={searchOpen}
            >
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => actions.updateSettings({ theme: isDark ? 'light' : 'dark' })}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setPanelOpen(true)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                <Bell size={18} />
              </Button>
              {unread ? (
                <span className="pointer-events-none absolute top-1.5 right-1.5 grid size-4.5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-emerald-950">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="ml-1 rounded-full transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/60"
              >
                <Avatar name={user?.name ?? 'Guest'} color={user?.avatarColor} url={user?.avatarUrl} size={36} />
                <span className="sr-only">Open account menu</span>
              </button>

              <AnimatePresence>
                {menuOpen ? (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="card absolute right-0 z-50 mt-2 w-56 overflow-hidden p-1.5 shadow-pop"
                      role="menu"
                    >
                      <div className="border-b border-line px-3 py-2.5">
                        <p className="truncate text-sm font-bold">{user?.name}</p>
                        <p className="truncate text-xs text-muted">{user?.email}</p>
                      </div>
                      {[
                        { label: 'Profile & settings', to: '/profile', icon: User },
                        { label: 'Goals', to: '/goals', icon: Target },
                        { label: 'Achievements', to: '/achievements', icon: Trophy },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-surface2 hover:text-ink',
                          )}
                        >
                          <item.icon size={16} aria-hidden />
                          {item.label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={logout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
                      >
                        <LogOut size={16} aria-hidden />
                        Log out
                      </button>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen ? (
            <motion.form
              onSubmit={submitSearch}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line px-4 pb-3 lg:hidden"
            >
              <label className="relative mt-3 block">
                <span className="sr-only">Search workouts</span>
                <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workouts…"
                  className="h-11 w-full rounded-2xl border border-line bg-surface2 pr-4 pl-11 text-sm focus:border-emerald-500/60 focus:bg-surface focus:outline-none"
                />
              </label>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </header>

      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  )
}
