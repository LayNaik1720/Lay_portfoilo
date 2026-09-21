import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheckBig, Info, TriangleAlert, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (input: { kind?: ToastKind; title: string; description?: string }) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CircleCheckBig size={18} className="text-emerald-500" />,
  error: <TriangleAlert size={18} className="text-rose-500" />,
  info: <Info size={18} className="text-sky-500" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((item) => item.id !== id)), [])

  const push = useCallback(
    ({ kind = 'info', title, description }: { kind?: ToastKind; title: string; description?: string }) => {
      counter.current += 1
      const id = counter.current
      setItems((prev) => [...prev.slice(-3), { id, kind, title, description }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (title, description) => push({ kind: 'success', title, description }),
      error: (title, description) => push({ kind: 'error', title, description }),
      info: (title, description) => push({ kind: 'info', title, description }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-24 z-200 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-4 shadow-pop"
            >
              <span className="mt-0.5">{ICONS[item.kind]}</span>
              <div className="flex-1">
                <p className="text-sm font-bold">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-xs text-muted">{item.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="rounded-lg p-1 text-muted transition-colors hover:bg-surface2 hover:text-ink"
              >
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
