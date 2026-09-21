import {
  ChartLine,
  CircleUser,
  Dumbbell,
  Droplets,
  Flame,
  LayoutDashboard,
  ListOrdered,
  Ruler,
  Target,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  /** shorter label used by the mobile bottom bar */
  mobileLabel?: string
  icon: LucideIcon
  /** shown in the mobile bottom bar */
  primary?: boolean
  group: 'primary' | 'tracking' | 'account'
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: LayoutDashboard, primary: true, group: 'primary' },
  { to: '/workouts', label: 'Workouts', mobileLabel: 'Workout', icon: Dumbbell, primary: true, group: 'primary' },
  { to: '/progress', label: 'Progress', icon: ChartLine, primary: true, group: 'primary' },
  { to: '/nutrition', label: 'Nutrition', icon: Flame, primary: true, group: 'primary' },
  { to: '/profile', label: 'Profile', icon: CircleUser, primary: true, group: 'account' },
  { to: '/water', label: 'Water', icon: Droplets, group: 'tracking' },
  { to: '/goals', label: 'Goals', icon: Target, group: 'tracking' },
  { to: '/body', label: 'Body Tracker', icon: Ruler, group: 'tracking' },
  { to: '/achievements', label: 'Achievements', icon: Trophy, group: 'tracking' },
  { to: '/history', label: 'History', icon: ListOrdered, group: 'tracking' },
]

export const MOBILE_NAV = NAV_ITEMS.filter((item) => item.primary)

export const PAGE_ORDER = ['/dashboard', '/workouts', '/progress', '/nutrition', '/profile', '/water', '/goals', '/body', '/achievements', '/history']
