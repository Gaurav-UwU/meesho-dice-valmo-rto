import { logit } from './math.ts'

/**
 * Case data pack: share of orders returned undelivered, by distance from the delivery hub.
 * ~2 km 15% · ~5 km 17% · 10 km+ 22%  (source: work/10-sources.md, Valmo case data pack)
 */
export const DISTANCE_POINTS = [
  { km: 2, rate: 0.15 },
  { km: 5, rate: 0.17 },
  { km: 10, rate: 0.22 },
] as const

export const BASELINE_RTO = 0.17

/** Linear interpolation between the published points; flat outside them. */
export function rtoRateByDistance(km: number): number {
  const pts = DISTANCE_POINTS
  if (km <= pts[0].km) return pts[0].rate
  const last = pts[pts.length - 1]
  if (km >= last.km) return last.rate
  for (let i = 1; i < pts.length; i++) {
    const lo = pts[i - 1]
    const hi = pts[i]
    if (km <= hi.km) {
      const t = (km - lo.km) / (hi.km - lo.km)
      return lo.rate + t * (hi.rate - lo.rate)
    }
  }
  return last.rate
}

/** How much the distance moves the log-odds of RTO relative to the 17% baseline. */
export function distanceLogitShift(km: number): number {
  return logit(rtoRateByDistance(km)) - logit(BASELINE_RTO)
}
