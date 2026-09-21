import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** render as a bottom sheet on phones (default true) */
  sheetOnMobile?: boolean
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md', sheetOnMobile = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input, button, textarea, select')?.focus()
    }, 60)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
      window.clearTimeout(timer)
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: sheetOnMobile ? 40 : 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: sheetOnMobile ? 30 : 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              'card relative z-10 max-h-[92vh] w-full overflow-hidden rounded-b-none shadow-pop sm:rounded-3xl',
              sheetOnMobile ? 'rounded-t-3xl' : 'rounded-3xl',
              SIZES[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                {title ? <h2 className="text-lg font-bold">{title}</h2> : null}
                {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
                <X size={18} />
              </Button>
            </div>
            <div className="max-h-[62vh] overflow-y-auto px-5 py-5">{children}</div>
            {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface2/60 px-5 py-4">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
