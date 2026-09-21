/* ------------------------------------------------------------------
   Safe localStorage helpers — the app must never crash because of a
   quota error, private-mode restriction or corrupt payload.
------------------------------------------------------------------ */

const PREFIX = 'pulse:v1'

export const storageKey = (name: string) => `${PREFIX}:${name}`

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(storageKey(key))
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value))
  } catch {
    /* storage full or unavailable — the in-memory state still works */
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(key))
  } catch {
    /* noop */
  }
}

/** Simple non-cryptographic hash — demo-only password check. */
export function hashPassword(password: string): string {
  let h1 = 0xdeadbeef ^ password.length
  let h2 = 0x41c6ce57 ^ password.length
  for (let i = 0; i < password.length; i += 1) {
    const ch = password.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`
}
