import { describe, expect, it } from 'vitest'
import { distanceLogitShift, rtoRateByDistance } from './distance.ts'

// Case data pack: distance from hub -> share returned undelivered
// ~2 km 15% · ~5 km 17% · 10 km+ 22%
describe('RTO by distance (case data pack)', () => {
  it('matches the three published points', () => {
    expect(rtoRateByDistance(2)).toBeCloseTo(0.15, 6)
    expect(rtoRateByDistance(5)).toBeCloseTo(0.17, 6)
    expect(rtoRateByDistance(10)).toBeCloseTo(0.22, 6)
  })

  it('interpolates linearly between points', () => {
    expect(rtoRateByDistance(3.5)).toBeCloseTo(0.16, 6)
    expect(rtoRateByDistance(7.5)).toBeCloseTo(0.195, 6)
  })

  it('clamps below 2 km and above 10 km', () => {
    expect(rtoRateByDistance(0.2)).toBeCloseTo(0.15, 6)
    expect(rtoRateByDistance(40)).toBeCloseTo(0.22, 6)
  })

  it('never decreases as distance grows', () => {
    let prev = 0
    for (let km = 0; km <= 30; km += 0.5) {
      const r = rtoRateByDistance(km)
      expect(r).toBeGreaterThanOrEqual(prev)
      prev = r
    }
  })

  it('logit shift is 0 at the 5 km baseline, negative nearer, positive farther', () => {
    expect(distanceLogitShift(5)).toBeCloseTo(0, 6)
    expect(distanceLogitShift(2)).toBeLessThan(0)
    expect(distanceLogitShift(12)).toBeGreaterThan(0)
  })
})
