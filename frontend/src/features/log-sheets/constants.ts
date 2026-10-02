import type { DutyStatus } from '@/types'

// The sheet is an SVG drawn in a 1000 x 1020 viewBox, laid out after
// docs/reference/blank-paper-log.png. All values below are viewBox units.

export const SHEET_W = 1000
export const SHEET_H = 1020

/** Printed form vs. what the driver "wrote" on it. */
export const FORM_COLOR = '#111827'
export const INK_COLOR = '#1d4ed8'
export const MUTED_INK = '#4b5563'
export const FORM_FONT = "'IBM Plex Sans', Helvetica, Arial, sans-serif"
export const INK_FONT = "'IBM Plex Mono', 'Courier New', monospace"

// --- graph grid ---
export const GRID_X = 170
export const HOUR_W = 30
export const GRID_W = HOUR_W * 24
export const BAND_Y = 296
export const BAND_H = 32
/** The black hour band runs past the grid so both "Mid-night" labels sit on it. */
export const BAND_OVERHANG = 24
export const ROW_TOP = BAND_Y + BAND_H
export const ROW_H = 36
export const GRID_BOTTOM = ROW_TOP + ROW_H * 4
export const TOTALS_X = 933

export const GRID_ROWS: { status: DutyStatus; label: string[] }[] = [
  { status: 'OFF', label: ['1. Off Duty'] },
  { status: 'SB', label: ['2. Sleeper', 'Berth'] },
  { status: 'D', label: ['3. Driving'] },
  { status: 'ON', label: ['4. On Duty', '(not driving)'] },
]

// --- sections below the grid ---
export const REMARKS_BOTTOM = 742
export const RECAP_Y = 812
export const SIGNATURE_Y = 995

// --- PDF export (US letter, points) ---
export const PDF_MARGIN_PT = 24
