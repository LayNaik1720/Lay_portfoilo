# Forge — Fitness Mobile App (work in progress)

A premium, mobile-first fitness app experience (Home · Workouts · Progress · Nutrition · Profile),
built as an original design inspired by the referenced Pinterest UI direction.

## Status: initial scaffold

This first commit contains the project foundation:

- **Toolchain** — Vite + React 18 + TypeScript, `zustand` for state, `lucide-react` for icons.
- **Curated visual assets** (`public/img/`) — 22 optimized fitness & nutrition photos
  (workout categories, hero/rest shots, meal cards, profile avatar), resized & compressed
  for mobile (~1.6 MB total).
- **Planned screens** — Home dashboard, workout browsing/player (workout + rest timers),
  exercise detail, progress dashboard with charts & filters, nutrition tracking with meal
  logging, profile with settings + dark/light theme, all with local persistence.

## Run

```bash
npm install
npm run dev      # dev server on :5173
npm run build    # production build
```

> Next commits will implement the full UI, state, timers, charts, and persistence layer.
