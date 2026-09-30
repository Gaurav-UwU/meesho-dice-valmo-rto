import { getHub } from '../engine/hubs.ts'
import { syntheticGeo } from '../engine/synthetic-geo.ts'
import type { GeoPoint, HubGeo, HubId } from '../engine/types.ts'

export { syntheticGeo }

export interface GeoFile {
  readonly hub: HubId
  readonly source: string
  readonly points: readonly GeoPoint[]
}

const files = import.meta.glob<GeoFile>('../../data/geo-*.json', { import: 'default' })

export type GeoLoader = (hubId: HubId) => Promise<HubGeo>

/** Real geography when data/geo-<hub>.json exists, otherwise the labelled synthetic stand-in. */
export const loadGeo: GeoLoader = async (hubId) => {
  const hub = getHub(hubId)
  const loader = files[`../../data/geo-${hubId}.json`]
  if (!loader) return syntheticGeo(hub)
  const file = await loader()
  return { hub, points: file.points }
}

export const usesRealGeo = (hubId: HubId): boolean => `../../data/geo-${hubId}.json` in files
