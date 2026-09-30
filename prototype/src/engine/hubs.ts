import type { Hub, HubId } from './types.ts'

/** The four pilot hubs: 2 metro + 2 smaller towns. Positions are locality centroids, not real hub addresses. */
export const HUBS: readonly Hub[] = [
  { id: 'powai', name: 'Mumbai · Powai', state: 'MH', tier: 'metro', lat: 19.1176, lng: 72.906, cityFactor: 0.95 },
  { id: 'whitefield', name: 'Bengaluru · Whitefield', state: 'KA', tier: 'metro', lat: 12.9698, lng: 77.75, cityFactor: 0.95 },
  { id: 'lucknow', name: 'Lucknow · Gomti Nagar', state: 'UP', tier: 'tier2', lat: 26.85, lng: 80.999, cityFactor: 1.1 },
  { id: 'gaya', name: 'Gaya', state: 'BR', tier: 'small', lat: 24.7914, lng: 85.0002, cityFactor: 1.4 },
]

export function getHub(id: HubId): Hub {
  const hub = HUBS.find((h) => h.id === id)
  if (!hub) throw new Error(`Unknown hub: ${id}`)
  return hub
}
