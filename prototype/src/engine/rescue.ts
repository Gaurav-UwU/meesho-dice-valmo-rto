import { distanceLogitShift } from './distance.ts'
import { logit, sigmoid } from './math.ts'
import type { Order } from './types.ts'

/**
 * Rescue Score = the TrustMesh risk signal plus the last-mile signals TrustMesh does not see.
 * Every weight is a log-odds contribution and is shown on the ops console, so nothing is a black box.
 * The TrustMesh input is a labelled stand-in in the prototype; Meesho's real score plugs into `order.trustmesh`.
 * Day 1 is rules like these. After the pilot, an uplift model replaces them (deck only, not built).
 */
export interface RescueWeights {
  readonly intercept: number
  readonly trustmeshLogit: number
  readonly cod: number
  readonly distance: number
  readonly addressUnclear: number
  readonly addressNew: number
  readonly phoneUnreachable: number
  readonly pastFailed: number
  readonly valueLn: number
}

export const RESCUE_WEIGHTS: RescueWeights = {
  intercept: -2.6,
  trustmeshLogit: 0.6,
  cod: 1.5,
  distance: 1,
  addressUnclear: 0.7,
  addressNew: 0.5,
  phoneUnreachable: 1.0,
  pastFailed: 0.5,
  valueLn: 0.25,
}

export const REFERENCE_ORDER_VALUE = 221
export const BONUS_ELIGIBLE_SHARE = 0.2

export interface Contribution {
  readonly label: string
  readonly logit: number
}

/** Each factor's contribution to the log-odds, for the "why was this flagged" panel. */
export function explainScore(o: Order, w: RescueWeights = RESCUE_WEIGHTS): readonly Contribution[] {
  return [
    { label: 'Baseline', logit: w.intercept },
    { label: 'TrustMesh signal (stand-in)', logit: w.trustmeshLogit * logit(o.trustmesh) },
    { label: o.payment === 'COD' ? 'Cash on delivery' : 'Prepaid', logit: o.payment === 'COD' ? w.cod : 0 },
    { label: `Distance from hub (${o.distanceKm.toFixed(1)} km)`, logit: w.distance * distanceLogitShift(o.distanceKm) },
    {
      label: o.addressQuality === 'clear' ? 'Clear address' : o.addressQuality === 'new' ? 'New address' : 'Unclear address',
      logit: o.addressQuality === 'unclear' ? w.addressUnclear : o.addressQuality === 'new' ? w.addressNew : 0,
    },
    { label: o.phoneReachable ? 'Phone reachable' : 'Phone unreachable', logit: o.phoneReachable ? 0 : w.phoneUnreachable },
    { label: `Past failed attempts (${o.pastFailedAttempts})`, logit: w.pastFailed * o.pastFailedAttempts },
    { label: `Order value (₹${Math.round(o.value)})`, logit: w.valueLn * Math.log(o.value / REFERENCE_ORDER_VALUE) },
  ]
}

/** Probability-like score in (0, 1). Used for ranking; the rider never sees it. */
export function rescueScore(o: Order, w: RescueWeights = RESCUE_WEIGHTS): number {
  return sigmoid(explainScore(o, w).reduce((sum, c) => sum + c.logit, 0))
}

/** Ids of the top `share` of orders by score. Ties break by id so the result is stable. */
export function flagBonusEligible(
  orders: readonly Order[],
  share: number = BONUS_ELIGIBLE_SHARE,
  w: RescueWeights = RESCUE_WEIGHTS,
): ReadonlySet<string> {
  const ranked = orders
    .map((o) => ({ id: o.id, score: rescueScore(o, w) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
  const count = Math.ceil(orders.length * share)
  return new Set(ranked.slice(0, count).map((r) => r.id))
}
