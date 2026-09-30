import { distanceLogitShift } from './distance.ts'
import { bisect, logit, mean, sigmoid } from './math.ts'
import { createRng, type Rng } from './rng.ts'
import type { AddressQuality, GeoPoint, HubGeo, Order, Payment, Rider } from './types.ts'

/**
 * Seeded synthetic orders. The orders are fake; the *rates* come from the case data pack:
 * COD is 80% of orders, COD RTO is 20%, prepaid RTO is 5%, RTO rises with distance 15/17/22%.
 * Everything else below is an illustrative assumption and is labelled as such on screen.
 */
export const DATA_PACK = { codShare: 0.8, codRto: 0.2, prepaidRto: 0.05 } as const

/** Assumptions (not from the data pack). The pilot measures them. */
export const ASSUMPTIONS = {
  addressUnclearShare: 0.18,
  addressNewShare: 0.1,
  phoneUnreachableShare: 0.1,
  pastFailedShares: [0.85, 0.1, 0.05] as const,
  valueMedian: 221,
  valueSigma: 0.6,
  nonGstSellerShare: 0.25,
} as const

/** How much each hidden factor really moves the odds of RTO (the "truth" the score can only estimate). */
const TRUTH = {
  addressUnclear: 0.7,
  addressNew: 0.5,
  phoneUnreachable: 1.0,
  pastFailed: 0.5,
  valueLn: 0.25,
  buyerRisk: 0.9,
} as const

/** TrustMesh stand-in: a noisy, skewed view of the hidden buyer risk. */
const TRUSTMESH = { scale: 1.2, offset: -1.5, noise: 0.5 } as const

/** Seller-state mix for registered (GST) sellers. Only UP and GJ are from the Meesho RHP; the rest is illustrative. */
export const SELLER_STATE_MIX: readonly (readonly [string, number])[] = [
  ['UP', 0.1587],
  ['GJ', 0.157],
  ['MH', 0.11],
  ['TN', 0.09],
  ['DL', 0.08],
  ['RJ', 0.07],
  ['WB', 0.07],
  ['KA', 0.06],
  ['TS', 0.06],
  ['BR', 0.0413],
  ['HR', 0.1030],
]

export interface GeneratedOrder {
  readonly order: Order
  /** Ground-truth probability that this order ends in RTO. Simulation only; never shown to riders. */
  readonly pRto: number
}

interface Draft {
  readonly point: GeoPoint
  readonly payment: Payment
  readonly value: number
  readonly addressQuality: AddressQuality
  readonly phoneReachable: boolean
  readonly pastFailedAttempts: number
  readonly buyerRisk: number
  readonly trustmesh: number
  readonly sellerGst: boolean
  readonly sellerState: string
}

function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0)
  let r = rng.next() * total
  for (const item of items) {
    r -= weight(item)
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

function drawDraft(hubGeo: HubGeo, rng: Rng): Draft {
  const point = pickWeighted(rng, hubGeo.points, (p) => p.weight)
  const payment: Payment = rng.chance(DATA_PACK.codShare) ? 'COD' : 'PREPAID'
  const value = Math.round(ASSUMPTIONS.valueMedian * Math.exp(ASSUMPTIONS.valueSigma * rng.normal()))
  const a = rng.next()
  const addressQuality: AddressQuality =
    a < ASSUMPTIONS.addressUnclearShare
      ? 'unclear'
      : a < ASSUMPTIONS.addressUnclearShare + ASSUMPTIONS.addressNewShare
        ? 'new'
        : 'clear'
  const phoneReachable = !rng.chance(ASSUMPTIONS.phoneUnreachableShare)
  const f = rng.next()
  const pastFailedAttempts = f < ASSUMPTIONS.pastFailedShares[0] ? 0 : f < ASSUMPTIONS.pastFailedShares[0] + ASSUMPTIONS.pastFailedShares[1] ? 1 : 2
  const buyerRisk = rng.normal()
  const seen = buyerRisk + TRUSTMESH.noise * rng.normal()
  const trustmesh = sigmoid(TRUSTMESH.scale * seen + TRUSTMESH.offset)
  const sellerGst = !rng.chance(ASSUMPTIONS.nonGstSellerShare)
  // Non-GST sellers can only sell inside their own state (Notif. 34/2023-CT), so they are always same-state as the hub.
  const sellerState = sellerGst ? pickWeighted(rng, SELLER_STATE_MIX, (s) => s[1])[0] : hubGeo.hub.state
  return { point, payment, value, addressQuality, phoneReachable, pastFailedAttempts, buyerRisk, trustmesh, sellerGst, sellerState }
}

/** Log-odds of RTO before the payment-specific intercept. */
function truthLogit(d: Draft): number {
  return (
    distanceLogitShift(d.point.distanceKm) +
    (d.addressQuality === 'unclear' ? TRUTH.addressUnclear : d.addressQuality === 'new' ? TRUTH.addressNew : 0) +
    (d.phoneReachable ? 0 : TRUTH.phoneUnreachable) +
    TRUTH.pastFailed * d.pastFailedAttempts +
    TRUTH.valueLn * Math.log(d.value / ASSUMPTIONS.valueMedian) +
    TRUTH.buyerRisk * d.buyerRisk
  )
}

/** Pick the intercept so the average RTO of `group` hits `target` exactly. */
function solveIntercept(group: readonly Draft[], target: number): number {
  if (group.length === 0) return logit(target)
  const shifts = group.map(truthLogit)
  const gap = (b: number): number => mean(shifts.map((s) => sigmoid(b + s))) - target
  if (gap(-12) > 0 || gap(6) < 0) throw new Error(`Cannot calibrate RTO to ${target}: target is outside the reachable range`)
  return bisect((b) => mean(shifts.map((s) => sigmoid(b + s))) - target, -12, 6)
}

export function generateOrders(hubGeo: HubGeo, n: number, seed: number): readonly GeneratedOrder[] {
  const rng = createRng(seed)
  const drafts = Array.from({ length: n }, () => drawDraft(hubGeo, rng))
  const factor = hubGeo.hub.cityFactor
  const cod = drafts.filter((d) => d.payment === 'COD')
  const prepaid = drafts.filter((d) => d.payment === 'PREPAID')
  const bCod = solveIntercept(cod, DATA_PACK.codRto * factor)
  const bPre = solveIntercept(prepaid, DATA_PACK.prepaidRto * factor)
  const pad = String(n).length
  return drafts.map((d, i) => {
    const id = `${hubGeo.hub.id}-${String(i + 1).padStart(Math.max(pad, 4), '0')}`
    const order: Order = {
      id,
      awb: `SYN${hubGeo.hub.id.slice(0, 3).toUpperCase()}${String(seed % 1000).padStart(3, '0')}${String(i + 1).padStart(5, '0')}`,
      hubId: hubGeo.hub.id,
      pincode: d.point.pincode,
      lat: d.point.lat,
      lng: d.point.lng,
      distanceKm: d.point.distanceKm,
      payment: d.payment,
      value: d.value,
      addressQuality: d.addressQuality,
      phoneReachable: d.phoneReachable,
      pastFailedAttempts: d.pastFailedAttempts,
      trustmesh: d.trustmesh,
      sellerState: d.sellerState,
      sellerGst: d.sellerGst,
    }
    const pRto = sigmoid((d.payment === 'COD' ? bCod : bPre) + truthLogit(d))
    return { order, pRto }
  })
}

/**
 * Riders are paired: 1 and 2, then 3 and 4, and so on. A coin decides which rider of each pair gets the Rescue Bonus, so the two groups are equally
 * matched. (A real pilot pairs on each rider's past delivery rate; here the synthetic riders have no history, so neighbours are the pairs.)
 * An odd last rider has no partner: they get their own pair id, so the verdict leaves them out.
 */
export function generateRiders(hubId: Rider['hubId'], n: number, seed: number): readonly Rider[] {
  const rng = createRng(seed)
  const make = (i: number, arm: Rider['arm'], pairId: string): Rider => ({
    id: `${hubId}-r${String(i + 1).padStart(2, '0')}`,
    name: `Rider ${String(i + 1).padStart(2, '0')}`,
    hubId,
    arm,
    pairId,
  })
  const riders: Rider[] = []
  for (let i = 0; i < n; i += 2) {
    const firstGetsBonus = rng.next() < 0.5
    const hasPartner = i + 1 < n
    const pairId = hasPartner ? `${hubId}-pair${i / 2 + 1}` : `${hubId}-solo`
    riders.push(make(i, firstGetsBonus ? 'bonus' : 'control', pairId))
    if (hasPartner) riders.push(make(i + 1, firstGetsBonus ? 'control' : 'bonus', pairId))
  }
  return riders
}
