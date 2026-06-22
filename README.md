# Garage — Workout Tracker

An offline-first, installable (PWA) workout tracker built for fast logging in the
gym. Your data lives on your device (IndexedDB) — no login, works with no signal.

Built with **Next.js (App Router) + TypeScript + Tailwind + Dexie**.

## Data model

Mirrors how the coaching spreadsheets actually work (tabs = training days,
weeks = columns within each tab):

- **Mesocycle** — one spreadsheet / training block (a number of weeks).
- **Day** — a training day / tab (e.g. Chest / Shoulders / Triceps).
- **Planned Exercise** — an exercise slot with its coaching layer: tempo, rest,
  coach note, demo video link, plus a default prescription.
- **Week Prescription** — the per-week target (sets / rep range / RIR), which
  can change week to week.
- **Session** — an actual instance of running a Day in a given week.
- **Set** — a logged set: weight, reps, RIR. Raw text and myo-rep clusters
  (e.g. `12.4.2` → 12 + 4 + 2) are preserved alongside the parsed numbers.

## Importing spreadsheets

The app imports coaching spreadsheets via on-device JSON (see
`/public/imports`). To convert a sheet, export it as `.xlsx` and run:

```bash
pip install openpyxl
python3 scripts/import_sheet.py <input.xlsx> public/imports/<slug>.json \
    --name "My Block" --coach coach@example.com --weeks 3
```

Then add an entry to `public/imports/manifest.json`. The **Import** screen in
the app lists these and writes them into IndexedDB on tap. The parser handles
the template's quirks (Google date-coercion of rep ranges, myo-rep notation).

Run the import pipeline smoke test with:

```bash
npm run test:import
```

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

- [x] Import existing coaching spreadsheets (matched to the real format).
- [ ] Progress charts per exercise (estimated 1RM, tonnage trends).
- [ ] In-app `.xlsx` upload (so new sheets import without the script).
- [ ] Optional cloud sync + multi-device.
- [ ] Export / backup of on-device data.
