import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({ ...options, open: true })
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setState((prev) => (prev ? { ...prev, open: false } : prev))
    resolver.current?.(result)
    resolver.current = null
    window.setTimeout(() => setState(null), 220)
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(state?.open)}
        onClose={() => close(false)}
        title={state?.title}
        description={state?.description}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={state?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
              {state?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}
