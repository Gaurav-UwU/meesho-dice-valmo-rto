import { HUBS } from './hubs.ts'
import { createRng } from './rng.ts'
import type { GeoPoint, HubGeo, Order } from './types.ts'

/** Shared fixtures for engine tests. Synthetic catchment: distances centred on ~5 km. */
export function fakeGeo(hubIndex = 0, cityFactor?: number): HubGeo {
  const rng = createRng(99)
  const points: GeoPoint[] = Array.from({ length: 300 }, (_, i) => ({
    pincode: String(400000 + i),
    lat: 19 + rng.next() / 10,
    lng: 72 + rng.next() / 10,
    distanceKm: Math.min(25, Math.max(0.5, 5 * Math.exp(0.6 * rng.normal()))),
    weight: 1,
  }))
  const base = HUBS[hubIndex]
  return { hub: cityFactor === undefined ? base : { ...base, cityFactor }, points }
}

export function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'powai-0001',
    awb: 'SYNPOW00100001',
    hubId: 'powai',
    pincode: '400076',
    lat: 19.12,
    lng: 72.9,
    distanceKm: 5,
    payment: 'PREPAID',
    value: 221,
    addressQuality: 'clear',
    phoneReachable: true,
    pastFailedAttempts: 0,
    trustmesh: 0.3,
    sellerState: 'MH',
    sellerGst: true,
    ...overrides,
  }
}
