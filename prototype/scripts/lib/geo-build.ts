import { haversineKm, ROAD_FACTOR, type LatLng } from '../../src/engine/geo.ts'
import type { GeoPoint } from '../../src/engine/types.ts'

/** Minimal RFC 4180 CSV reader: quoted fields, doubled quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

export interface PinRow extends LatLng {
  readonly pincode: string
}

const HEADERS = {
  pincode: ['pincode', 'pin', 'pin_code', 'pin code', 'postal code'],
  lat: ['latitude', 'lat'],
  lng: ['longitude', 'long', 'lng', 'lon'],
} as const

const findCol = (header: readonly string[], names: readonly string[]): number => header.findIndex((h) => names.includes(h.trim().toLowerCase()))

/** Pull pincode + coordinates out of a pincode directory CSV. Rows with missing or "NA" coordinates are skipped. */
export function rowsFromCsv(text: string): PinRow[] {
  const [header, ...body] = parseCsv(text)
  if (!header) return []
  const ip = findCol(header, HEADERS.pincode)
  const ia = findCol(header, HEADERS.lat)
  const io = findCol(header, HEADERS.lng)
  if (ip < 0 || ia < 0 || io < 0) throw new Error('CSV needs pincode, latitude and longitude columns')
  const out: PinRow[] = []
  for (const r of body) {
    const pincode = (r[ip] ?? '').trim()
    const latText = (r[ia] ?? '').trim()
    const lngText = (r[io] ?? '').trim()
    const lat = Number(latText)
    const lng = Number(lngText)
    if (!/^\d{6}$/.test(pincode) || latText === '' || lngText === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat < 6 || lat > 38 || lng < 68 || lng > 98) continue // outside India: bad data
    out.push({ pincode, lat, lng })
  }
  return out
}

/** One point per pincode (several post offices share one: average them), within `radiusKm` of the hub. */
export function selectCatchment(rows: readonly PinRow[], hub: LatLng, radiusKm: number): PinRow[] {
  const byPin = new Map<string, PinRow[]>()
  for (const r of rows) byPin.set(r.pincode, [...(byPin.get(r.pincode) ?? []), r])
  const merged = [...byPin.entries()].map(
    ([pincode, list]): PinRow => ({
      pincode,
      lat: list.reduce((s, x) => s + x.lat, 0) / list.length,
      lng: list.reduce((s, x) => s + x.lng, 0) / list.length,
    }),
  )
  return merged.filter((p) => haversineKm(hub, p) <= radiusKm).sort((a, b) => (a.pincode < b.pincode ? -1 : 1))
}

/** Delivery volume is unknown, so denser demand near the hub is assumed (same shape as the synthetic stand-in). */
export const demandWeight = (distanceKm: number): number => 1 / (1 + distanceKm / 6)

/** `roadKm` holds routed distances (from OSRM) by pincode; anything missing falls back to straight line x 1.3. */
export function buildPoints(rows: readonly PinRow[], hub: LatLng, roadKm: ReadonlyMap<string, number> = new Map()): GeoPoint[] {
  return rows.map((r) => {
    const km = roadKm.get(r.pincode) ?? haversineKm(hub, r) * ROAD_FACTOR
    const distanceKm = Math.max(0.4, Math.round(km * 10) / 10)
    return { pincode: r.pincode, lat: r.lat, lng: r.lng, distanceKm, weight: demandWeight(distanceKm) }
  })
}
