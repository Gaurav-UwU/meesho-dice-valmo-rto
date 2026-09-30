import { BONUS_ELIGIBLE_SHARE } from './rescue.ts'

/**
 * Unit economics for the Rescue Bonus and Hold & Re-home.
 * Every default here is a number from the case data pack or our own model (work/10-sources.md).
 */

export interface BonusParams {
  /** ₹ paid to the rider on each delivered Bonus-Eligible order */
  readonly bonus: number
  /** ₹ cost of hauling a parcel back (reverse leg) */
  readonly reverseCost: number
  /** ₹ rider fee Valmo also pays on each rescued order (0 on the data-pack basis, 18 in the conservative case) */
  readonly riderFee: number
  /** Deliveries per 100 flagged orders without the bonus (an assumption; the pilot measures it) */
  readonly baselineSuccess: number
}

export const DEFAULTS: BonusParams = { bonus: 15, reverseCost: 120, riderFee: 0, baselineSuccess: 60 }
export const CONSERVATIVE: BonusParams = { ...DEFAULTS, riderFee: 18 }

export const FLAGGED_SHARE = BONUS_ELIGIBLE_SHARE
export const VALMO_ORDERS_PER_YEAR = 763.5e6
/** 20% of 763.5 mn, rounded to 153 mn exactly as on deck slide 5 so app and deck agree. */
export const FLAGGED_ORDERS_PER_YEAR = 153e6
export const FORWARD_COST = 50
const CRORE = 1e7

/** Net ₹ per 100 flagged orders if `delta` extra deliveries are rescued. */
export function netPer100(delta: number, p: BonusParams = DEFAULTS): number {
  const saving = (p.reverseCost - p.riderFee) * delta
  const cost = p.bonus * (p.baselineSuccess + delta)
  return saving - cost
}

/** Extra deliveries per 100 flagged orders at which the bonus pays for itself. */
export function breakEvenDelta(p: BonusParams = DEFAULTS): number {
  return (p.bonus * p.baselineSuccess) / (p.reverseCost - p.riderFee - p.bonus)
}

/** Net ₹ crore a year across all flagged orders (153 mn for the top 20%; fewer if the cut is tighter). */
export function annualNetCr(bonus: number, delta: number, base: BonusParams = DEFAULTS, flaggedPerYear: number = FLAGGED_ORDERS_PER_YEAR): number {
  const perOrder = netPer100(delta, { ...base, bonus }) / 100
  return (perOrder * flaggedPerYear) / CRORE
}

/** Rows = bonus levels, columns = deltas. */
export function sensitivityTable(
  bonuses: readonly number[],
  deltas: readonly number[],
  base: BonusParams = DEFAULTS,
): number[][] {
  return bonuses.map((b) => deltas.map((d) => annualNetCr(b, d, base)))
}

/** Network RTO points saved when `delta` extra deliveries per 100 are rescued on the flagged share. */
export function rtoPointsSaved(delta: number, flaggedShare: number = FLAGGED_SHARE): number {
  return delta * flaggedShare
}

/** ₹ crore a year that one RTO point is worth (every avoided RTO saves the reverse leg). */
export function rtoPointValueCr(reverseCost: number = DEFAULTS.reverseCost): number {
  return (VALMO_ORDERS_PER_YEAR * 0.01 * reverseCost) / CRORE
}

/** Blended cost of one successful delivery: (forward + rto × reverse) / (1 − rto). */
export function costPerSuccessfulDelivery(
  rto: number,
  forward: number = FORWARD_COST,
  reverse: number = DEFAULTS.reverseCost,
): number {
  return (forward + rto * reverse) / (1 - rto)
}

export const ROUTER = { savedPerMatch: 145, holdCost: 8, reAttemptCost: 21 } as const

/** Match rate at which holding a parcel for 48h stops losing money. */
export function routerBreakEven(holdCost: number = ROUTER.holdCost, saved: number = ROUTER.savedPerMatch): number {
  return holdCost / saved
}

/** Expected ₹ per held parcel at a given match rate. */
export function routerNetPerHeldParcel(
  matchRate: number,
  holdCost: number = ROUTER.holdCost,
  saved: number = ROUTER.savedPerMatch,
): number {
  return matchRate * saved - holdCost
}
