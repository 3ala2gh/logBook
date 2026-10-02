# CLAUDE.md

ELD Trip Planner: a take-home assessment (Django + React). The user enters current location, pickup, drop-off and cycle hours used. The app plans the trip under FMCSA Hours of Service rules (property-carrying, 70 h / 8 days) and outputs a route map with stops plus one filled-in Drivers Daily Log sheet per day. Graders test the hosted app for **accuracy** and weigh **UI/UX** heavily. See [README.md](README.md) for the full brief, rules and assumptions.

Reference material is in `docs/reference/`: the FMCSA guide PDF (the source of truth for the rules), the blank paper log the SVG sheet copies, and the assessment brief.

## Commands

Windows dev machine. A venv at the repo root is shared by the backend.

```powershell
# Backend (from backend/)
..\.venv\Scripts\python manage.py runserver 8000
..\.venv\Scripts\python -m pytest            # ~40 tests incl. ~650 Hypothesis cases
..\.venv\Scripts\ruff check . ; ..\.venv\Scripts\ruff format .

# Frontend (from frontend/)
npm run dev        # :5173, proxies /api to :8000
npm test           # vitest
npm run lint       # oxlint
npm run build      # tsc -b && vite build
```

Run backend tests, frontend tests, lint and build before committing.

## Architecture

```
backend/
  planner/     PURE Python rules engine: no Django, no network. Fully unit-testable.
    config.py    every HOS limit and planner assumption as a named constant
    hos.py       build_timeline(legs, cycle_used_hours, start) -> [Segment]
    logs.py      split_days(): cut at midnight, pad Off Duty, totals, remarks, recap
    geometry.py  position along the route polyline by mile
  services/    provider clients + response assembly (routing.py, geocoding.py, trip_plan.py)
  trips/       DRF serializers/views/urls and the uniform error handler (errors.py)
  tests/       invariants.py re-checks every HOS rule independently of the planner
frontend/src/
  app/         App root (two routes: / and /demo/log, no router needed)
  pages/       one folder per page; page-only pieces live next to the page
  features/    one folder per feature (see below)
  components/  shared, feature-agnostic UI: ui/ (Spinner, Collapsible, ErrorAlert, ColorDot), layout/ (AppHeader)
  constants/   app-wide constants: duty colors/order, stop metadata, HOS figures the UI shows
  lib/         api-client.ts (axios instance + ApiError), format.ts
  types/       shared domain types split by domain: duty, place, trip, log, api
```

API: `GET /api/health/`, `GET /api/geocode/?q=`, `POST /api/trips/plan/`. Errors are always `{"error": {"code", "message", "field?"}}`.

## Conventions

### Frontend

- **Feature folder layout:** `components/`, `hooks/`, `utils/`, `api.ts`, `constants.ts`, `types.ts`, and an `index.ts` that is the feature's public API. Only add the pieces a feature needs.
- **Imports:** across features and to shared code, use the `@/` alias and import from a feature's `index.ts` only (`@/features/log-sheets`, never `@/features/log-sheets/components/...`). Inside a feature, use relative imports.
- **Where things go:**
  - Shared domain types go in `src/types/<domain>.ts`, re-exported from `src/types/index.ts`. Feature-only types go in that feature's `types.ts`.
  - App-wide constants go in `src/constants/`. Feature-only constants go in the feature's `constants.ts`. No magic numbers in components.
  - A component used by 2+ features goes in `src/components/`.
- **Components:** one per file. Keep them small and composable (`LogSheet` is composed of one section component per form section). A file exports only components; helpers live in `utils/`, because oxlint `only-export-components` breaks fast refresh otherwise.
- **React 19:**
  - Pass `ref` as a normal prop; don't use `forwardRef`.
  - Don't sync state through `useEffect`. Derive values during render, or use the "previous value in state" pattern (see `LocationAutocomplete`).
  - Don't read `ref.current` during render.
- **Pure logic** (validation, geometry, grouping) goes in `utils/` with a colocated `*.test.ts`.
- **Duty-status colors** must be consistent everywhere: use `DUTY` from `@/constants`, or the Tailwind tokens `bg-duty-off|sb|d|on` defined in `index.css`.
- **Tailwind v4:**
  - Custom classes that other classes `@apply` must be declared with `@utility`, not `@layer components`.
  - Prefer canonical classes (`z-500`, not `z-[500]`).
- **Accessibility is graded with UI:**
  - The autocomplete is an ARIA combobox.
  - Day tabs are ARIA tabs.
  - Focus moves to the first invalid field.
  - Focus must stay visible.

### Backend

- **`planner/` must stay pure.** Rules change only in `planner/config.py` and `planner/hos.py`. Every new rule needs an invariant in `tests/invariants.py` and a scenario test.
- **Units:**
  - Time is integer minutes on 15-minute slots.
  - Datetimes are naive in home-terminal time; the time zone is applied only at the edges (`services/trip_plan.py`).
  - Distances are miles.
- **Errors:**
  - Expected failures raise `TripError` (code + message + field).
  - Provider failures raise `ProviderError`.
  - No route raises `Unroutable`.
  - Never return a stack trace.
- **Style:** ruff, single quotes, line length 110.

## Gotchas

- **Writing files from PowerShell:** PowerShell 5.1 `Set-Content -Encoding utf8` adds a BOM, which crashed `ruff format`. Write files with the editor tools. If you must use .NET, use `[IO.File]::WriteAllText` with an **absolute** path; .NET resolves relative paths against a different working directory than the shell.
- **Providers:**
  - Nominatim's policy forbids autocomplete, so search uses Photon.
  - Reverse geocoding uses Photon `layer=city` to get town names instead of roads or counties.
  - CARTO tiles now require a key, so the map uses OSM tiles.
  - Without `ORS_API_KEY`, routing falls back to the OSRM demo at 55 mph.
- **34-hour restart placement:** `build_timeline` tries a restart at each unavoidable 10-hour rest and keeps the earliest arrival (`candidate_timelines`). Property tests check every candidate, not just the winner.
- **Recap:** prior cycle hours are one lump that doesn't roll off. That's why recap A = C and the 60-hour columns are blank.
- **Commits:** git user is `3ala2`, and commits are made only when the user asks. End commit messages with the `Co-Authored-By` line given by the session's attribution instructions.
- **Hosting:** the API is on Render (free; it sleeps, and the frontend shows "Waking the server…"), configured by `render.yaml`. The web app is on Vercel, root `frontend/`, with `VITE_API_URL` set.
