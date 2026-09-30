import { describe, expect, it } from 'vitest'
import { haversineKm, roadKmEstimate } from './geo.ts'

describe('geo', () => {
  it('measures a known distance (Mumbai to Pune is about 120 km in a straight line)', () => {
    const d = haversineKm({ lat: 19.076, lng: 72.8777 }, { lat: 18.5204, lng: 73.8567 })
    expect(d).toBeGreaterThan(115)
    expect(d).toBeLessThan(125)
  })

  it('is zero for the same point and symmetric', () => {
    const a = { lat: 26.85, lng: 80.99 }
    const b = { lat: 26.9, lng: 81.05 }
    expect(haversineKm(a, a)).toBeCloseTo(0, 9)
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9)
  })

  it('road estimate is 1.3x the straight line', () => {
    const a = { lat: 19.1, lng: 72.9 }
    const b = { lat: 19.2, lng: 73 }
    expect(roadKmEstimate(a, b)).toBeCloseTo(haversineKm(a, b) * 1.3, 9)
  })
})
