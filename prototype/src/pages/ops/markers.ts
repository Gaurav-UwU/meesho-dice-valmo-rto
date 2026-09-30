import type { StopRecord } from '../../domain/types.ts'
import { STATUS_LABEL } from './model.ts'

export const MARKER_COLORS = {
  hub: '#142C5B',
  neutral: '#8FA3BF',
  flagged: '#7B2FF2',
  delivered: '#0E8A4F',
  attempted: '#C77700',
  refused: '#D93025',
  suspect: '#D93025',
  otp: '#5985F7',
  muted: '#C4CAD8',
  white: '#FFFFFF',
} as const

/** Plain values only, so a memoised marker re-renders only when its own look changes. */
export interface MarkerDatum {
  readonly id: string
  readonly lat: number
  readonly lng: number
  readonly radius: number
  readonly fill: string
  readonly fillOpacity: number
  readonly ring: string
  readonly ringWeight: number
  readonly flagged: boolean
  readonly label: string
}

function fillFor(x: StopRecord): { readonly fill: string; readonly opacity: number } {
  switch (x.status) {
    case 'delivered_a1':
    case 'delivered_a2':
    case 'rehomed':
      return { fill: MARKER_COLORS.delivered, opacity: 0.95 }
    case 'ndr':
      return { fill: MARKER_COLORS.attempted, opacity: 0.95 }
    case 'refused':
    case 'rto':
      return { fill: MARKER_COLORS.refused, opacity: 0.95 }
    case 'otp_sent':
      return { fill: MARKER_COLORS.otp, opacity: 0.95 }
    case 'rescheduled':
    case 'hub_pickup':
    case 'cancelled':
      return { fill: MARKER_COLORS.muted, opacity: 0.6 }
    case 'scored':
    case 'out_for_delivery':
      return x.flagged ? { fill: MARKER_COLORS.flagged, opacity: 0.35 } : { fill: MARKER_COLORS.neutral, opacity: 0.75 }
  }
}

export function markerDatum(x: StopRecord): MarkerDatum {
  const { fill, opacity } = fillFor(x)
  const suspect = x.assessment?.status === 'suspect'
  const ring = suspect ? MARKER_COLORS.suspect : x.flagged ? MARKER_COLORS.flagged : MARKER_COLORS.white
  const tags = [STATUS_LABEL[x.status], x.flagged ? 'Bonus-Eligible' : '', suspect ? 'suspect attempt' : ''].filter(Boolean)
  return {
    id: x.order.id,
    lat: x.order.lat,
    lng: x.order.lng,
    radius: x.flagged ? 7 : 4,
    fill,
    fillOpacity: opacity,
    ring,
    ringWeight: suspect || x.flagged ? 3 : 1,
    flagged: x.flagged,
    label: `${x.order.awb} · ${tags.join(' · ')}`,
  }
}

export const buildMarkerData = (stops: readonly StopRecord[]): readonly MarkerDatum[] => stops.map(markerDatum)

/** South-west and north-east corners, in the shape Leaflet takes. */
export type Bounds = [[number, number], [number, number]]

export function catchmentBounds(stops: readonly StopRecord[], hub: { readonly lat: number; readonly lng: number }): Bounds {
  let minLat = hub.lat
  let maxLat = hub.lat
  let minLng = hub.lng
  let maxLng = hub.lng
  for (const x of stops) {
    minLat = Math.min(minLat, x.order.lat)
    maxLat = Math.max(maxLat, x.order.lat)
    minLng = Math.min(minLng, x.order.lng)
    maxLng = Math.max(maxLng, x.order.lng)
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}
