import { parseCsv } from './geo-build.ts'

export type NominatimFetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface PinCoord {
  readonly pincode: string
  readonly lat: number
  readonly lng: number
  readonly label: string
}

/** Districts (as spelled in the pincode directory) whose pincodes could fall inside each hub's catchment. */
export const HUB_DISTRICTS: Readonly<Record<string, readonly string[]>> = {
  lucknow: ['Lucknow'],
  powai: ['Mumbai', 'Thane'],
  whitefield: ['Bangalore'],
  gaya: ['Gaya'],
}

/** Unique 6-digit pincodes listed under any of the districts. The directory's own coordinates are not trusted, only its lists. */
export function candidatePincodes(csvText: string, districts: readonly string[]): string[] {
  const [header, ...body] = parseCsv(csvText.replace(/^﻿/, ''))
  if (!header) return []
  const norm = header.map((h) => h.trim().toLowerCase())
  const ip = norm.findIndex((h) => h === 'postal code' || h === 'pincode' || h === 'pin')
  const id = norm.indexOf('district')
  if (ip < 0 || id < 0) throw new Error('CSV needs postal code and District columns')
  const wanted = new Set(districts.map((d) => d.toLowerCase()))
  const pins = new Set<string>()
  for (const r of body) {
    const pin = (r[ip] ?? '').trim()
    if (/^\d{6}$/.test(pin) && wanted.has((r[id] ?? '').trim().toLowerCase())) pins.add(pin)
  }
  return [...pins].sort()
}

/** Ask OpenStreetMap's Nominatim for a pincode's centre. null = not found or the request failed. */
export async function geocodePincode(pincode: string, doFetch: NominatimFetch): Promise<PinCoord | null> {
  try {
    const res = await doFetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`)
    if (!res.ok) return null
    const body = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[]
    const hit = body[0]
    const lat = Number(hit?.lat)
    const lng = Number(hit?.lon)
    if (!hit || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { pincode, lat, lng, label: hit.display_name ?? '' }
  } catch {
    return null
  }
}

/** Geocode one at a time, at most one request per `pauseMs` (Nominatim's usage policy), skipping anything already cached. */
export async function geocodeAll(
  pincodes: readonly string[],
  cache: Readonly<Record<string, PinCoord | null>>,
  doFetch: NominatimFetch,
  pauseMs = 1100,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  onProgress: (done: number, total: number) => void = () => undefined,
): Promise<Record<string, PinCoord | null>> {
  const out: Record<string, PinCoord | null> = { ...cache }
  let done = 0
  for (const pin of pincodes) {
    if (!(pin in out)) {
      out[pin] = await geocodePincode(pin, doFetch)
      await sleep(pauseMs)
    }
    done++
    onProgress(done, pincodes.length)
  }
  return out
}

/** The CSV that scripts/build-geo.ts reads. */
export function toGeocodedCsv(coords: readonly PinCoord[]): string {
  const lines = coords.map((c) => `${c.pincode},${c.lat},${c.lng},"${c.label.replace(/"/g, '""')}"`)
  return ['pincode,latitude,longitude,source', ...lines].join('\n') + '\n'
}
