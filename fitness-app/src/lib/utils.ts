/* ------------------------------------------------------------------
   Small shared helpers: classnames, formatting, dates, misc
------------------------------------------------------------------ */

/**
 * Tiny classname joiner. Accepts anything (including React nodes from
 * `cond && <Icon/>` style expressions) and keeps only the real strings.
 */
export function cn(...values: unknown[]): string {
  const out: string[] = []
  for (const value of values) {
    if (!value) continue
    if (Array.isArray(value)) {
      const nested = cn(...value)
      if (nested) out.push(nested)
    } else if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value))
    }
  }
  return out.join(' ')
}

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/* ------------------------------- dates ------------------------------- */

export const dateKey = (date: Date | string = new Date()): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayKey = () => dateKey(new Date())

export const fromKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export const addDays = (date: Date | string, days: number): Date => {
  const d = typeof date === 'string' ? fromKey(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** array of YYYY-MM-DD keys, oldest → newest, ending today */
export const lastNDays = (n: number, end: Date | string = new Date()): string[] => {
  const endDate = typeof end === 'string' ? fromKey(end) : end
  return Array.from({ length: n }, (_, i) => dateKey(addDays(endDate, i - (n - 1))))
}

/** Sunday-first week containing `date` */
export const weekKeys = (date: Date | string = new Date()): string[] => {
  const d = typeof date === 'string' ? fromKey(date) : new Date(date)
  const start = addDays(d, -d.getDay())
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)))
}

export const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${`${m}`.padStart(2, '0')}:${`${sec}`.padStart(2, '0')}`
  return `${`${m}`.padStart(2, '0')}:${`${sec}`.padStart(2, '0')}`
}

export const formatShortDate = (key: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
  fromKey(key).toLocaleDateString('en-US', opts)

export const weekdayShort = (key: string) => fromKey(key).toLocaleDateString('en-US', { weekday: 'short' })

export const weekdayLetter = (key: string) => fromKey(key).toLocaleDateString('en-US', { weekday: 'narrow' })

export const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return fromKey(dateKey(iso)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const greeting = (date = new Date()): string => {
  const h = date.getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000)

/* ------------------------------- units ------------------------------- */

export const KG_TO_LB = 2.20462
export const CM_TO_IN = 0.393701

export const formatWeight = (kg: number, units: 'metric' | 'imperial', decimals = 1) =>
  units === 'imperial' ? `${round(kg * KG_TO_LB, decimals)} lb` : `${round(kg, decimals)} kg`

export const formatHeight = (cm: number, units: 'metric' | 'imperial') => {
  if (units === 'imperial') {
    const totalIn = cm * CM_TO_IN
    const ft = Math.floor(totalIn / 12)
    const inch = Math.round(totalIn % 12)
    return `${ft}'${inch}"`
  }
  return `${round(cm, 0)} cm`
}

export const formatLength = (cm: number, units: 'metric' | 'imperial') =>
  units === 'imperial' ? `${round(cm * CM_TO_IN, 1)} in` : `${round(cm, 1)} cm`

export const formatMl = (ml: number) => (ml >= 1000 ? `${round(ml / 1000, 1)}L` : `${round(ml, 0)}ml`)

export const formatSteps = (steps: number) => Math.max(0, Math.round(steps)).toLocaleString('en-US')

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${round(minutes, 0)} min`
  const h = Math.floor(minutes / 60)
  const m = round(minutes % 60, 0)
  return m ? `${h}h ${m}m` : `${h}h`
}

export const percent = (value: number, total: number) => (total <= 0 ? 0 : clamp((value / total) * 100, 0, 100))

export const titleCase = (value: string) =>
  value
    .split(/[\s-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

export const hashCode = (value: string): string => {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

export const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0)

export const average = (values: number[]) => (values.length ? sum(values) / values.length : 0)

export const MOVEMENT_LEVELS: { key: string; label: string; blurb: string }[] = [
  { key: 'sedentary', label: 'Sedentary', blurb: 'Desk job, little movement' },
  { key: 'light', label: 'Lightly Active', blurb: 'Light exercise 1–3 days/week' },
  { key: 'moderate', label: 'Moderately Active', blurb: 'Exercise 3–5 days/week' },
  { key: 'very', label: 'Very Active', blurb: 'Hard training 6–7 days/week' },
]
