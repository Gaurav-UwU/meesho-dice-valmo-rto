import type { LatLng } from '../../src/engine/geo.ts'
import type { PinRow } from './geo-build.ts'

export type OsrmFetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

const CHUNK = 40

/**
 * Routed road distance (km) from the hub to each pincode using the public OSRM demo server.
 * That server is shared and can vanish, so we go slowly (`pauseMs` between calls), skip failures, and the caller caches the result.
 */
export async function osrmDistances(
  hub: LatLng,
  points: readonly PinRow[],
  doFetch: OsrmFetch,
  pauseMs = 1100,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  for (let i = 0; i < points.length; i += CHUNK) {
    const chunk = points.slice(i, i + CHUNK)
    const coords = [hub, ...chunk].map((p) => `${p.lng},${p.lat}`).join(';')
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance`
    try {
      const res = await doFetch(url)
      if (res.ok) {
        const body = (await res.json()) as { distances?: (number | null)[][] }
        const row = body.distances?.[0] ?? []
        chunk.forEach((p, k) => {
          const meters = row[k + 1]
          if (typeof meters === 'number') out.set(p.pincode, meters / 1000)
        })
      }
    } catch {
      // Leave this chunk to the straight-line fallback.
    }
    if (i + CHUNK < points.length) await sleep(pauseMs)
  }
  return out
}
