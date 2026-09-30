export interface LatLng {
  readonly lat: number
  readonly lng: number
}

const EARTH_KM = 6371
const rad = (d: number): number => (d * Math.PI) / 180

/** Straight-line distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

/** Rough road distance when we have no routed distance: straight line x 1.3. */
export const ROAD_FACTOR = 1.3
export const roadKmEstimate = (a: LatLng, b: LatLng): number => haversineKm(a, b) * ROAD_FACTOR
