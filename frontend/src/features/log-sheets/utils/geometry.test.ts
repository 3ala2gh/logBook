import { describe, expect, it } from 'vitest'
import { GRID_W, GRID_X } from '../constants'
import { dutyPath, hourLabel, minuteX } from './geometry'

describe('geometry', () => {
  it('maps midnight to midnight across the grid', () => {
    expect(minuteX(0)).toBe(GRID_X)
    expect(minuteX(1440)).toBe(GRID_X + GRID_W)
  })

  it('only steps vertically when the status changes', () => {
    const d = dutyPath([
      { status: 'OFF', activity: 'Off duty', start_minute: 0, end_minute: 600, place: null },
      { status: 'OFF', activity: 'Off duty', start_minute: 600, end_minute: 1440, place: null },
    ])
    expect(d).not.toContain('V')
  })

  it('labels the hour band like the paper form', () => {
    expect(hourLabel(0)).toEqual(['Mid-', 'night'])
    expect(hourLabel(12)).toEqual(['Noon'])
    expect(hourLabel(13)).toEqual(['1'])
  })
})
