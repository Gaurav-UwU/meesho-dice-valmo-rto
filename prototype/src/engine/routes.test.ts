import { describe, expect, it } from 'vitest'
import { generateOrders, generateRiders } from './generate.ts'
import { assignRoutes } from './routes.ts'
import { fakeGeo } from './testkit.ts'

describe('assignRoutes', () => {
  const geo = fakeGeo()
  const orders = generateOrders(geo, 100, 3).map((g) => g.order)
  const riders = generateRiders('powai', 8, 3)
  const routes = assignRoutes(orders, riders, geo.hub)

  it('gives every order to exactly one rider', () => {
    expect(routes).toHaveLength(100)
    expect(new Set(routes.map((r) => r.orderId)).size).toBe(100)
  })

  it('splits the day evenly (bags differ by at most one stop)', () => {
    const sizes = riders.map((r) => routes.filter((x) => x.riderId === r.id).length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
  })

  it('numbers each bag 1..n, nearest stop first', () => {
    for (const r of riders) {
      const bag = routes.filter((x) => x.riderId === r.id).sort((a, b) => a.seq - b.seq)
      expect(bag.map((s) => s.seq)).toEqual(bag.map((_, i) => i + 1))
      const dists = bag.map((s) => orders.find((o) => o.id === s.orderId)!.distanceKm)
      expect(dists).toEqual([...dists].sort((a, b) => a - b))
    }
  })

  it('is deterministic', () => {
    expect(assignRoutes(orders, riders, geo.hub)).toEqual(routes)
  })

  it('returns nothing when there are no riders or no orders', () => {
    expect(assignRoutes(orders, [], geo.hub)).toEqual([])
    expect(assignRoutes([], riders, geo.hub)).toEqual([])
  })
})
