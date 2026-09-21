import { useEffect, useState } from 'react'

/**
 * Shows skeleton states for a short beat on first paint so heavy pages
 * never flash empty. Returns true while "loading".
 */
export function useMountLoading(delay = 320) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  return loading
}
