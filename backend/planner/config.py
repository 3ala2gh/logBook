"""Every rule limit and planner assumption, in one place.

All durations are in minutes. Rule references are to the FMCSA "Interstate
Truck Driver's Guide to Hours of Service" (April 2022) and 49 CFR 395.
"""

from .models import Status

DAY_MINUTES = 24 * 60

# Paper logs are kept in quarter-hour increments; every segment boundary in
# the timeline lands on a multiple of this.
SLOT_MINUTES = 15

# --- Hours of Service limits (property-carrying, 70 hours / 8 days) ---------
MAX_DRIVING_PER_SHIFT = 11 * 60  # 11-hour driving limit, § 395.3(a)(3)
SHIFT_WINDOW = 14 * 60  # 14-hour driving window, § 395.3(a)(2)
MAX_DRIVING_WITHOUT_BREAK = 8 * 60  # 30-minute break rule, § 395.3(a)(3)(ii)
BREAK_MINUTES = 30
DAILY_REST_MINUTES = 10 * 60  # 10 consecutive hours off resets the 11/14 clocks
CYCLE_LIMIT = 70 * 60  # 70 hours on duty in 8 days, § 395.3(b)
RESTART_MINUTES = 34 * 60  # 34-hour restart, § 395.3(c)

# --- Trip assumptions from the assessment -----------------------------------
PICKUP_MINUTES = 60
DROPOFF_MINUTES = 60
FUEL_INTERVAL_MILES = 1000
FUEL_MINUTES = 30

# --- Planner assumptions (documented in the README and the UI) -------------
PRE_TRIP_MINUTES = 15  # at the start of every shift; 0 disables
POST_TRIP_MINUTES = 15  # before every 10-hour rest / restart and at trip end; 0 disables

BREAK_STATUS = Status.OFF
DAILY_REST_STATUS = Status.SLEEPER
RESTART_STATUS = Status.OFF

# Don't stop for a 30-minute break if, after it, less than this much driving
# would be left in the shift; take the 10-hour rest straight away instead.
MIN_USEFUL_DRIVE = 15

# At trip start, begin with a 34-hour restart only if the 70-hour cycle leaves
# less than this much driving. (Mid-trip, a restart replaces a 10-hour rest
# whenever the cycle cannot cover the rest of the trip; see hos.daily_rest.)
RESTART_ESCALATION_DRIVE = 60

# Used when the routing provider only knows car speeds (OSRM fallback).
FALLBACK_TRUCK_MPH = 55

# A leg shorter than this is treated as zero (e.g. current location = pickup).
MIN_LEG_MILES = 0.05
