# Loom walkthrough outline (3–5 min)

**0:00 – Intro (20 s)**
"This is Logbook: you give it a truck trip and it plans the Hours of Service stops and fills in the daily log sheets." Mention it's live on Vercel + Render.

**0:20 – The flow (60 s)**
- Type a location to show autocomplete (keyboard works too).
- Click **Try an example**: Los Angeles → Dallas → New York, 20 h used.
- Summary cards: ~3,000 mi, driving time, arrival, 6 log sheets, cycle left.

**1:20 – Map and timeline (50 s)**
- Dashed line = empty run to pickup, solid = loaded.
- Click a 10-hr rest in the timeline: the map flies there. Each stop says *why* ("11-hour driving limit reached", "Fuel at least every 1,000 miles").
- Point out the 34-hour restart and its reason.

**2:10 – Log sheets (60 s)**
- Day tabs; the duty line, totals that add to 24, remarks bracketed under the grid with City, ST, recap with 70-hour totals.
- Download PDF / Print (one sheet per page).
- Open `/demo/log`: the FMCSA guide's own example drawn by the same component, totals match.

**3:10 – Code (60–90 s)**
- `backend/planner/hos.py`: pure function, "drive the largest legal chunk, then insert what the binding limit requires"; restart placement chosen for earliest arrival.
- `backend/tests/invariants.py` + Hypothesis: every plan replayed against all rules.
- `services/`: ORS truck routing with OSRM fallback, Photon geocoding, caching.
- Frontend feature folders; `LogSheet.tsx` is a hand-built SVG of the paper form.

**4:30 – Wrap (15 s)**
Assumptions are listed in the app and README; constants live in one config file.
