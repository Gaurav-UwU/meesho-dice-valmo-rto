import { describe, expect, it } from 'vitest'
import { holdEvText } from './lanes.ts'

const bits = (hold: number | null, others: readonly string[], forecastCloses: boolean) => holdEvText({ hold, others, forecastCloses })

describe('the hold part of the expected-value line', () => {
  it('shows the rupees when Hold is possible', () => {
    expect(bits(12.8, [], false)).toBe('+₹13')
  })

  it('names the gates that block Hold, instead of "not allowed"', () => {
    expect(bits(null, ['Same state', 'Seller opted in'], false)).toBe('blocked by Same state, Seller opted in')
  })

  it('says the forecast closed it when that is the only reason', () => {
    expect(bits(null, [], true)).toBe('closed: the forecast low end is under break-even')
  })

  it('says both when a gate and the forecast fail', () => {
    expect(bits(null, ['Seal intact'], true)).toBe('blocked by Seal intact, and the forecast low end is under break-even')
  })
})
