import { roadKmEstimate } from './geo.ts'
import { createRng, hashSeed } from './rng.ts'
import type { GeoPoint, Hub, HubGeo } from './types.ts'

const CATCHMENT_KM = 14
const POINTS = 160

/**
 * Stand-in catchment used until the real pincode file for a hub is added to data/geo-<hub>.json.
 * Points scatter around the hub centroid with denser demand near the hub. Labelled synthetic everywhere it is shown.
 */
export function syntheticGeo(hub: Hub): HubGeo {
  const rng = createRng(hashSeed(`geo-${hub.id}`))
  const kmPerDegLat = 111
  const kmPerDegLng = 111 * Math.cos((hub.lat * Math.PI) / 180)
  const points: GeoPoint[] = Array.from({ length: POINTS }, (_, i) => {
    const r = CATCHMENT_KM * Math.sqrt(rng.next())
    const theta = rng.next() * 2 * Math.PI
    const lat = hub.lat + (r * Math.cos(theta)) / kmPerDegLat
    const lng = hub.lng + (r * Math.sin(theta)) / kmPerDegLng
    const distanceKm = Math.max(0.4, Math.round(roadKmEstimate(hub, { lat, lng }) * 10) / 10)
    return { pincode: `area-${String(i + 1).padStart(3, '0')}`, lat, lng, distanceKm, weight: 1 / (1 + distanceKm / 6) }
  })
  return { hub, points }
}
