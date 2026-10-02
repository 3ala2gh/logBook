import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { JOHN_DOE_DETAILS, JOHN_DOE_LOG } from '../../fixtures/johnDoe'
import { minuteX, rowCenterY } from '../../utils/geometry'
import { LogSheet } from './LogSheet'

// The completed example from the FMCSA guide, pp. 18-19 (John Doe, 04/09/2021).
describe('LogSheet: golden FMCSA example', () => {
  const renderSheet = () => render(<LogSheet log={JOHN_DOE_LOG} details={JOHN_DOE_DETAILS} />)

  it('totals each duty status as in the guide, summing to 24', () => {
    expect(JOHN_DOE_LOG.totals).toEqual({ OFF: 10, SB: 1.75, D: 7.75, ON: 4.5 })
    expect(Object.values(JOHN_DOE_LOG.totals).reduce((a, b) => a + b, 0)).toBe(24)
  })

  it('writes the totals column and the =24 check', () => {
    const { container } = renderSheet()
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent)
    for (const value of ['10', '1.75', '7.75', '4.5', '=24']) expect(texts).toContain(value)
    expect(screen.getByRole('img')).toHaveAccessibleName("Driver's daily log for 2021-04-09")
  })

  it('draws one continuous duty line with a vertical stroke at each status change', () => {
    renderSheet()
    const d = screen.getByTestId('duty-line').getAttribute('d') ?? ''
    expect(d.startsWith(`M ${minuteX(0)} ${rowCenterY('OFF')}`)).toBe(true)
    expect(d.endsWith(`H ${minuteX(1440)}`)).toBe(true)
    expect(d.match(/V /g)).toHaveLength(12)
  })

  it('writes each place once in the remarks, like the guide', () => {
    renderSheet()
    const remarks = screen.getAllByTestId('remark').map((r) => r.textContent)
    const places = ['Richmond, VA', 'Fredericksburg, VA', 'Baltimore, MD', 'Philadelphia, PA', 'Cherry Hill, NJ', 'Newark, NJ']
    expect(remarks).toHaveLength(places.length)
    places.forEach((place, i) => expect(remarks[i]).toContain(place))
  })
})
