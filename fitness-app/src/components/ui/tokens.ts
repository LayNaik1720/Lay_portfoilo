/* ------------------------------------------------------------------
   Centralised colour language. Every metric in the app owns one tone so
   the interface stays balanced instead of rainbow-coloured.
------------------------------------------------------------------ */

export type Tone = 'brand' | 'calorie' | 'water' | 'violet' | 'amber' | 'rose' | 'neutral'

export interface ToneStyle {
  /** readable text colour on both themes */
  text: string
  /** soft tinted background */
  soft: string
  /** solid fill (charts, buttons, badges) */
  solid: string
  /** hex used by SVG / charts */
  hex: string
  hexSoft: string
}

export const TONES: Record<Tone, ToneStyle> = {
  brand: {
    text: 'text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-500/10 dark:bg-emerald-400/12',
    solid: 'bg-emerald-500 text-emerald-950',
    hex: '#10B981',
    hexSoft: 'rgba(16,185,129,0.16)',
  },
  calorie: {
    text: 'text-orange-600 dark:text-orange-400',
    soft: 'bg-orange-500/10 dark:bg-orange-400/12',
    solid: 'bg-orange-500 text-orange-950',
    hex: '#F97316',
    hexSoft: 'rgba(249,115,22,0.16)',
  },
  water: {
    text: 'text-sky-600 dark:text-sky-400',
    soft: 'bg-sky-500/10 dark:bg-sky-400/12',
    solid: 'bg-sky-500 text-sky-950',
    hex: '#38BDF8',
    hexSoft: 'rgba(56,189,248,0.16)',
  },
  violet: {
    text: 'text-violet-600 dark:text-violet-400',
    soft: 'bg-violet-500/10 dark:bg-violet-400/12',
    solid: 'bg-violet-500 text-white',
    hex: '#A855F7',
    hexSoft: 'rgba(168,85,247,0.16)',
  },
  amber: {
    text: 'text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-500/10 dark:bg-amber-400/12',
    solid: 'bg-amber-500 text-amber-950',
    hex: '#F59E0B',
    hexSoft: 'rgba(245,158,11,0.16)',
  },
  rose: {
    text: 'text-rose-600 dark:text-rose-400',
    soft: 'bg-rose-500/10 dark:bg-rose-400/12',
    solid: 'bg-rose-500 text-white',
    hex: '#F43F5E',
    hexSoft: 'rgba(244,63,94,0.16)',
  },
  neutral: {
    text: 'text-ink2',
    soft: 'bg-surface2',
    solid: 'bg-ink text-page',
    hex: '#64748B',
    hexSoft: 'rgba(100,116,139,0.16)',
  },
}

export const DIFFICULTY_TONE: Record<string, Tone> = {
  Beginner: 'brand',
  Intermediate: 'amber',
  Advanced: 'rose',
}

export const MEAL_TONE: Record<string, Tone> = {
  breakfast: 'amber',
  lunch: 'brand',
  dinner: 'violet',
  snack: 'water',
}
