import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LogSheet } from './components/LogSheet'
import { JOHN_DOE_DETAILS, JOHN_DOE_LOG } from './fixtures/johnDoe'
import { dutyPath, groupRemarks, minuteX, rowCenterY } from './geometry'

describe('golden FMCSA example (John Doe, 04/09/2021)', () => {
  it('totals each duty status as in the guide and sums to 24', () => {
    expect(JOHN_DOE_LOG.totals).toEqual({ OFF: 10, SB: 1.75, D: 7.75, ON: 4.5 })
    const sum = Object.values(JOHN_DOE_LOG.totals).reduce((a, b) => a + b, 0)
    expect(sum).toBe(24)
  })

  it('draws the totals column and the =24 check on the sheet', () => {
    const { container } = render(<LogSheet log={JOHN_DOE_LOG} details={JOHN_DOE_DETAILS} />)
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent)
    for (const value of ['10', '1.75', '7.75', '4.5', '=24']) expect(texts).toContain(value)
    expect(screen.getByRole('img')).toHaveAccessibleName("Driver's daily log for 2021-04-09")
  })

  it('draws one continuous duty line with a vertical stroke at each status change', () => {
    const { getByTestId } = render(<LogSheet log={JOHN_DOE_LOG} details={JOHN_DOE_DETAILS} />)
    const d = getByTestId('duty-line').getAttribute('d')!
    expect(d.startsWith(`M ${minuteX(0)} ${rowCenterY('OFF')}`)).toBe(true)
    expect(d.endsWith(`H ${minuteX(1440)}`)).toBe(true)
    expect(d.match(/V /g)).toHaveLength(12)
  })

  it('writes each place once, like the remarks in the guide', () => {
    const { getAllByTestId } = render(<LogSheet log={JOHN_DOE_LOG} details={JOHN_DOE_DETAILS} />)
    const remarks = getAllByTestId('remark').map((r) => r.textContent)
    const places = ['Richmond, VA', 'Fredericksburg, VA', 'Baltimore, MD', 'Philadelphia, PA', 'Cherry Hill, NJ', 'Newark, NJ']
    expect(remarks).toHaveLength(places.length)
    places.forEach((place, i) => expect(remarks[i]).toContain(place))
  })
})

describe('groupRemarks', () => {
  it('brackets consecutive changes at one place and names the stop, not the driving', () => {
    const groups = groupRemarks([
      { minute: 300, status: 'ON', activity: 'Pre-trip inspection', place: 'Roscoe, TX' },
      { minute: 315, status: 'D', activity: 'Driving', place: 'Roscoe, TX' },
      { minute: 600, status: 'ON', activity: 'Fuel', place: 'Abilene, TX' },
      { minute: 630, status: 'D', activity: 'Driving', place: 'Abilene, TX' },
    ])
    expect(groups).toEqual([
      { start: 300, end: 315, place: 'Roscoe, TX', activity: 'Pre-trip inspection' },
      { start: 600, end: 630, place: 'Abilene, TX', activity: 'Fuel' },
    ])
  })
})

describe('dutyPath', () => {
  it('only steps vertically when the status changes', () => {
    const d = dutyPath([
      { status: 'OFF', activity: 'Off duty', start_minute: 0, end_minute: 600, place: null },
      { status: 'OFF', activity: 'Off duty', start_minute: 600, end_minute: 1440, place: null },
    ])
    expect(d).not.toContain('V')
  })
})
