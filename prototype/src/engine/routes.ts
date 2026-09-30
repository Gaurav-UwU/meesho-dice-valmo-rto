import type { Hub, Order, Rider } from './types.ts'

export interface RouteAssignment {
  readonly orderId: string
  readonly riderId: string
  /** 1-based position in the rider's bag, nearest stop first */
  readonly seq: number
}

const bearing = (hub: Hub, o: Order): number => Math.atan2(o.lng - hub.lng, o.lat - hub.lat)

/**
 * Split the day into one contiguous wedge of the catchment per rider (by bearing from the hub),
 * then order each bag nearest-first. Simple, deterministic, and looks like a real delivery bag.
 */
export function assignRoutes(orders: readonly Order[], riders: readonly Rider[], hub: Hub): readonly RouteAssignment[] {
  if (riders.length === 0 || orders.length === 0) return []
  const sortedRiders = [...riders].sort((a, b) => (a.id < b.id ? -1 : 1))
  const byBearing = [...orders].sort((a, b) => bearing(hub, a) - bearing(hub, b) || (a.id < b.id ? -1 : 1))
  const out: RouteAssignment[] = []
  sortedRiders.forEach((rider, i) => {
    const from = Math.floor((i * byBearing.length) / sortedRiders.length)
    const to = Math.floor(((i + 1) * byBearing.length) / sortedRiders.length)
    byBearing
      .slice(from, to)
      .sort((a, b) => a.distanceKm - b.distanceKm || (a.id < b.id ? -1 : 1))
      .forEach((o, k) => out.push({ orderId: o.id, riderId: rider.id, seq: k + 1 }))
  })
  return out
}
