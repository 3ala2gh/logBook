# Logbook: ELD Trip Planner

Plan a truck trip under the FMCSA Hours of Service rules and get the filled-in **Drivers Daily Log** sheets for every day of it.

Enter where the truck is, the pickup, the drop-off and the hours already used in the 70-hour cycle. The app routes the trip for a truck, schedules every required break, fuel stop, 10-hour rest and 34-hour restart, shows them on a map and a timeline, and draws one log sheet per calendar day.

- **Live app:** _add the Vercel URL here_
- **API:** _add the Render URL here_ (`/api/health/`)
- **Renderer check:** `/demo/log` draws the completed example from the FMCSA guide (John Doe, pp. 18–19) with the same component used for planned trips.

> Free hosting: the API sleeps after 15 idle minutes. The page pings it on load and shows "Waking the server…" until it answers (up to about a minute).

## What it does

| Input | Output |
|---|---|
| Current location, pickup, drop-off (autocomplete) | Truck route on a map, with the empty run to pickup drawn dashed and the loaded leg solid |
| Current cycle used (0–70 h) | Every stop with time, place, duration and the rule that caused it, linked to the map |
| Departure time (optional) | Summary: distance, driving time, trip duration, arrival, number of days, cycle hours left |
| Log sheet details (optional: driver, carrier, truck…) | One SVG Drivers Daily Log per day: header, duty line, totals, remarks, shipping docs, 70-hour recap. Print or download as a vector PDF. |

Try **Try an example** (Los Angeles → Dallas → New York, 20 h used): about 3,000 miles, six log sheets, with breaks, fuel stops, rests and a 34-hour restart.

## Hours of Service rules implemented

Property-carrying driver, 70 hours / 8 days, no adverse driving conditions. References are to the FMCSA *Interstate Truck Driver's Guide to Hours of Service* (April 2022), in [`docs/reference/`](docs/reference/).

| Rule | Guide | Where in code |
|---|---|---|
| 11 hours driving after 10 consecutive hours off | p. 6, § 395.3(a)(3) | `planner/hos.py` `limits()` → `drive11` |
| No driving after the 14th hour since coming on duty; breaks don't extend it | p. 6, § 395.3(a)(2) | `window14` |
| 30-minute break after 8 cumulative hours of driving; any non-driving status counts, if consecutive | p. 10, § 395.3(a)(3)(ii) | `break8`, `not_driving_run` |
| 10 consecutive hours off/sleeper resets the 11 and 14 | pp. 6–7 | `daily_rest()` |
| No driving once 70 hours on duty in 8 days | pp. 10–11, § 395.3(b) | `cycle70` |
| 34 consecutive hours off resets the 70 | p. 11, § 395.3(c) | `restart()` |
| Log: 24-hour grid, one line, totals = 24, city/state at each change of status, home-terminal time | pp. 15–19 | `planner/logs.py`, `frontend/src/features/log-sheets/` |

Out of scope, as in the brief: split sleeper berth pairings (7/3, 8/2), adverse conditions, short-haul and 16-hour exceptions, personal conveyance, yard moves, team driving.

### How the planner works

`backend/planner/hos.py` is pure Python with no Django and no network. It walks the trip (drive to pickup → 1 h pickup → drive to drop-off → 1 h drop-off). For each driving step it drives the longest chunk every limit allows: the minimum of time left in the leg, 11 h − driving in shift, the end of the 14-hour window, 8 h − driving since a break, 70 h − cycle, and the miles left until 1,000 since the last fuel. When a limit binds, it inserts what that limit requires and carries on.

When the 70-hour cycle cannot cover the whole trip, a 34-hour restart is unavoidable. The planner tries it in place of each 10-hour rest from that point on, and also leaves it until the cycle actually runs out. It keeps whichever plan arrives first. `planner/logs.py` then cuts the timeline at midnights, pads the first and last day with Off Duty, and computes totals, remarks and the recap.

## Assumptions

All constants are in [`backend/planner/config.py`](backend/planner/config.py) and are listed in the app's *Planning assumptions* panel.

| Assumption | Value |
|---|---|
| Driver at trip start | Rested (10+ h off), full 11/14 available; only the cycle hours carry in |
| Departure | User-chosen, default now, rounded up to the next quarter hour |
| Pickup / drop-off | 1 hour each, On Duty (not driving) |
| Fuel | At most 1,000 miles apart (tank full at start), 30 min On Duty |
| Inspections | 15 min pre-trip at the start of each shift; 15 min post-trip before each rest and at trip end |
| 30-min break | Off Duty. Skipped in favor of the 10-hour rest if under 15 min of driving would be left in the shift. |
| Daily rest | 10 consecutive hours in the Sleeper Berth |
| 34-hour restart | Off Duty; placed for the earliest arrival (see above). At trip start, taken first only if the cycle leaves under 1 hour of driving. |
| Prior cycle hours | One total that does not roll off during the trip (the per-day history is unknown); only a restart clears it |
| Time zone | Home terminal = time zone of the current location; all sheets use it, with no conversion when crossing zones (guide p. 16) |
| Rounding | Quarter hours, as on paper logs. Driving time per leg is rounded up, and a fuel chunk is rounded down so 1,000 miles is never exceeded. |
| Speeds | OpenRouteService's truck (`driving-hgv`) durations; with the OSRM fallback, 55 mph |
| Remarks | Nearest town to each change of status ("City, ST"); the user's own label for the three trip points |
| Recap | 70-hour columns: A and C = cycle total (prior hours are one lump), B = 70 − A; 60-hour columns left blank |

## Architecture

```
backend/                     Django + DRF, stateless (no database)
  planner/                   pure rules engine: hos.py, logs.py, geometry.py, config.py, models.py
  services/                  routing.py (ORS → OSRM), geocoding.py (ORS → Photon), trip_plan.py (assembles the response)
  trips/                     serializers, views, uniform error handler
  tests/                     scenarios, Hypothesis property tests, API tests with mocked providers
frontend/                    React + TypeScript + Vite + Tailwind, feature-based
  src/features/              trip-form, route-map, stop-timeline, trip-summary, log-sheets, health
  src/components/            shared UI (ui/, layout/)
  src/constants/             duty colors, stop metadata, HOS figures
  src/types/                 domain types mirroring the API (duty, place, trip, log, api)
  src/lib/                   API client, formatting
docs/reference/              assessment brief, FMCSA guide, blank log form
```

| Concern | Choice |
|---|---|
| Truck routing | [openrouteservice](https://openrouteservice.org) `driving-hgv` (free key, server-side), falling back to the public OSRM demo at 55 mph |
| Place search | [Photon](https://photon.komoot.io) (built for autocomplete; Nominatim's policy forbids it), ORS when a key is set; debounced, cached |
| Reverse geocoding | Photon `layer=city` / ORS, deduplicated on a ~3-mile grid, cached, in parallel |
| Map | Leaflet + OpenStreetMap tiles |
| Log sheets | Hand-built SVG of the paper form; vector PDF via jsPDF + svg2pdf.js; print CSS, one sheet per page |
| Hosting | Frontend on Vercel, API on Render (free web service) |

### API

- `GET /api/health/` → `{"status": "ok"}`
- `GET /api/geocode/?q=dallas` → `[{label, lat, lng}]`
- `POST /api/trips/plan/` with `{current, pickup, dropoff: {label, lat, lng}, cycle_used_hours, start_time?, log_details?}` → `{summary, route, locations, stops, segments, daily_logs, log_details, assumptions}`

Errors always look like `{"error": {"code", "message", "field?"}}`: `VALIDATION` (400), `UNROUTABLE` (422, e.g. across an ocean), `PROVIDER_DOWN` (502).

## Tests

```bash
cd backend && ../.venv/bin/python -m pytest      # Windows: ..\.venv\Scripts\python -m pytest
cd frontend && npm test
```

- **Invariants** (`backend/tests/invariants.py`) replay every plan independently, the way an inspector reads a log: ≤ 11 h driving between 10-hour rests, no driving after hour 14, ≤ 8 h driving without a 30-min break, never driving past 70 h, ≤ 1,000 miles between fuel stops, driven miles = route miles, pickup and drop-off each exactly 1 h at the right place and order, and every day exactly 24 h, contiguous, on quarter hours.
- **Property tests** (Hypothesis) run those invariants on about 650 random trips per run, including every alternative restart placement the planner considers.
- **Scenarios:** same-day trip, exactly one 30-min break, 11- and 14-hour limits, multi-day trip, fuel over 1,000 miles, a restart forced mid-trip, 70 h used at start, current location = pickup, midnight splitting.
- **Golden log:** the FMCSA John Doe example (totals 10 / 1.75 / 7.75 / 4.5 = 24) is checked in both the backend day splitter and the frontend renderer.

## Run locally

Requirements: Python 3.13, Node 20+.

```bash
# API
python -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt     # Windows: .venv\Scripts\pip
cp backend/.env.example backend/.env                      # optionally add ORS_API_KEY
cd backend && ../.venv/bin/python manage.py runserver

# Web (second terminal)
cd frontend && npm install && npm run dev                 # http://localhost:5173, proxies /api to :8000
```

## Deploy

1. **API on Render:** New → Blueprint → this repo ([`render.yaml`](render.yaml)). Set `CORS_ALLOWED_ORIGINS` to the Vercel URL, `ORS_API_KEY`, and `GEOCODER_USER_AGENT`.
2. **Web on Vercel:** import the repo with Root Directory `frontend`. Set `VITE_API_URL=https://<render-service>.onrender.com/api`.
3. Open the Vercel URL, then `/demo/log`.

---

Planning aid for the assessment, not a certified ELD. Map data © OpenStreetMap contributors.
