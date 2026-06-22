# Garage — Workout Tracker

An offline-first, installable (PWA) workout tracker built for fast logging in the
gym. Your data lives on your device (IndexedDB) — no login, works with no signal.

Built with **Next.js (App Router) + TypeScript + Tailwind + Dexie**.

## Data model

Mirrors how the old training spreadsheets worked:

- **Mesocycle** — one spreadsheet / training block (a length in weeks).
- **Day** — a training day within the meso (e.g. Push / Pull / Legs).
- **Planned Exercise** — the prescription for an exercise on a day
  (target sets, rep range, RIR).
- **Session** — an actual instance of running a Day in a given week.
- **Set** — a logged set: weight, reps, RIR, done.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploy to Vercel

1. Push this branch to GitHub.
2. In Vercel, **New Project → import this repo**. Framework preset is
   auto-detected as Next.js — no extra config needed.
3. Deploy. Open the URL on your phone and **Add to Home Screen** to install it
   as an app.

## Roadmap

- Import existing Google Sheets / CSV mesocycles (matched to your exact format).
- Progress charts per exercise (estimated 1RM, tonnage trends).
- Optional cloud sync + multi-device.
- Export / backup of on-device data.
