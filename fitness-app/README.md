# Pulse — Fitness & Workout App

A premium, fully responsive fitness platform built with **React 19 + TypeScript + Vite + Tailwind CSS v4**.
Every screen is functional: authentication, onboarding, guided workout player, nutrition, hydration,
body tracking, goals, streaks, achievements and statistics — all persisted in the browser.

```
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm test         # run the end-to-end flow test suite (vitest + jsdom)
```

## Try it

| Account | Credentials |
| --- | --- |
| Demo account (84 days of seeded history) | `alex@pulse.fit` / `pulse1234` |
| Or just click **Explore the demo account** on the login screen | — |
| New account | Register → 5-step onboarding wizard |

## Feature map

| Area | What it does |
| --- | --- |
| **Auth** | Email/password login + register with validation, password strength meter, Google (simulated) sign-in, forgot-password flow, demo account |
| **Onboarding** | Name, age, gender, height, weight → goal, activity level, experience, preferred place; computes BMR/TDEE targets live and can seed sample history |
| **Dashboard** | Live greeting, today's goal ring, streak strip, 5 stat cards, quick hydration, weekly training chart, weekly report, recommendations, recent activity, achievement preview, empty states |
| **Workouts** | 30 sessions / 75 exercises, search, 5 filter groups (muscle, difficulty, duration, equipment, place), category tabs, 4 sort modes |
| **Workout detail** | Hero, meta grid, exercise list with animated figures, sets × reps, rest, coaching cues, personalised calorie estimate, per-exercise "Start" |
| **Workout player** | Set-by-set tracking, rest countdown with skip/+15s, pause, previous/next, keyboard shortcuts (Space, ←, →, Enter), coach tips, completion overlay with confetti + session rating |
| **Progress** | Weight, calories, workout frequency, duration, steps and hydration charts across 7d/30d/3m/1y, consistency panel, tooltips, responsive charts |
| **Nutrition** | Calorie ring (consumed/burned/remaining), macro donut + bars vs targets, meals by type, quick-add food library, day navigation, empty states |
| **Water** | Circular hydration progress, +250/+500/+750ml, custom amounts, undo, editable goal (35ml/kg suggestion), 7-day chart, 30-day insights, per-entry log |
| **Goals** | Templates + custom goals, auto-tracked metrics (weight, workouts, steps, water, calories), progress rings, deadlines, complete/delete/edit |
| **Body tracker** | Weight, BMI + category, body-fat estimate, chest/waist/hips/arms/thighs, trend charts with range switcher, editable history |
| **Achievements** | 16 badges across 4 tiers with live progress, level/XP system, streak strip, celebration animation |
| **History** | Grouped by day, search + filters, expandable session detail with per-exercise completion, rating and delete |
| **Profile** | Photo upload, personal info, editable targets (+recalculate), notification toggles, units, theme, privacy, password change, JSON export, data reset, account deletion |
| **Notifications** | Bell drawer with unread count, generated reminders for workouts, hydration, streak risk and weekly reports, achievement alerts |

## Architecture

```
src/
├── components/          reusable UI
│   ├── charts/          theme-aware Recharts wrappers (area, bars, line, donut)
│   ├── dashboard/       daily goal ring, streak strip
│   ├── exercise/        animated SVG athlete + pose library
│   ├── layout/          sidebar, topbar, bottom nav, page header, auth shell
│   ├── sessions/        session row + expandable history item
│   ├── ui/              button, card, field, modal, badge, progress, switch, toast,
│   │                    confirm dialog, skeleton, empty state, stat card, tokens
│   └── workout/         workout card / row
├── hooks/               useIsDark, useMediaQuery, useMountLoading
├── lib/                 domains logic: types, utils, fitness maths, exercises,
│                        workouts, achievements, nutrition, seed data, storage
├── pages/               one file per route (code-split)
├── store/               reducer, AppStore provider, derived fitness selectors
└── __tests__/           end-to-end flow tests
```

**Design system** — a single `index.css` defines semantic CSS variables (`--page`, `--surface`, `--ink`, `--muted` …)
consumed through Tailwind v4 `@theme inline`, so light/dark themes and the five metric accent tones
(emerald, orange, blue, purple, amber) stay consistent everywhere. `components/ui/tokens.ts` is the only
place colour is mapped to meaning.

**Data** — everything (users, sessions, meals, water, body entries, goals, notifications, achievements) lives in
`localStorage` under `pulse:v1:*`, written through a pure reducer, so state survives refreshes and multi-account
flows stay separated. Nothing is hard-coded in the UI: targets come from BMR/TDEE maths, calories from MET
values × body weight, streaks from activity dates, and achievements from live statistics.

## Accessibility & responsiveness

Skip-to-content link, semantic landmarks, labelled inputs with inline errors, `aria-pressed`/`aria-current`
states, visible focus rings, keyboard-operable dialogs (focus trap + Escape), screen-reader labels on icon-only
buttons, `prefers-reduced-motion` support, and a mobile-specific layout (its own bottom navigation, sticky
topbar, bottom-sheet dialogs and stacked cards) rather than a scaled-down desktop view.
