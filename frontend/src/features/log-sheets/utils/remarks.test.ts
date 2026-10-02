import { describe, expect, it } from 'vitest'
import { groupRemarks } from './remarks'

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

  it('keeps "Driving" when it is the only change at a place', () => {
    const [group] = groupRemarks([{ minute: 0, status: 'D', activity: 'Driving', place: 'Kingman, AZ' }])
    expect(group.activity).toBe('Driving')
  })
})
