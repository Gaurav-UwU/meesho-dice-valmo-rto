import { createRng, hashSeed, type Rng } from '../engine/rng.ts'
import { REFUSAL_REASONS, type RefusalReason, type RefusedParcel } from '../engine/router.ts'
import type { Hub } from '../engine/types.ts'
import type { StopRecord } from './types.ts'

/**
 * How a refused parcel looks when it reaches the hub desk. These shares are ASSUMPTIONS, not data:
 * the 30-day pilot measures the real ones (dwell time, refusal reasons, seal and invoice practice, demand for the SKU).
 */
export const PARCEL_ASSUMPTIONS = {
  /** Why customers refuse: no cash, later, not home, changed mind, cheaper elsewhere, didn't order, damaged (sums to 1) */
  reasonShares: [0.15, 0.12, 0.1, 0.25, 0.15, 0.1, 0.13],
  unopenedShare: 0.9,
  sealOkShare: 0.92,
  invoiceOutsideShare: 0.7,
  optedInNonGst: 0.5,
  optedInGst: 0.3,
  /** Share of SKUs with real demand in the catchment, and the buyers-per-hour range for those and for the rest (synthetic) */
  highDemandShare: 0.35,
  highDemandRate: [0.03, 0.08],
  lowDemandRate: [0, 0.004],
} as const

const SELLERS_PER_HUB = 40
const SKUS_PER_HUB = 60

function drawReason(rng: Rng): RefusalReason {
  let u = rng.next()
  for (const [i, share] of PARCEL_ASSUMPTIONS.reasonShares.entries()) {
    u -= share
    if (u < 0) return REFUSAL_REASONS[i]
  }
  return REFUSAL_REASONS[REFUSAL_REASONS.length - 1]
}

/** Demand in the showcase is high enough that a buyer usually turns up inside the 48 h window */
const SHOWCASE_DEMAND = 0.2

/**
 * The reserved demo stops refuse in four different ways, so a presenter can show every Router outcome without fiddling:
 * 1 Hold & Re-home (all gates pass), 2 second chance (not home), 3 out-of-state seller, 4 broken seal.
 */
export const SHOWCASE: readonly ((hub: Hub) => Partial<RefusedParcel>)[] = [
  (hub) => ({ reason: 'not_ordered', sellerGst: false, sellerState: hub.state, unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: SHOWCASE_DEMAND }),
  () => ({ reason: 'not_home' }),
  () => ({ reason: 'not_ordered', sellerGst: true, sellerState: 'GJ', unopened: true, sealOk: true, sellerOptedIn: true, invoiceOutside: true, demandRate: SHOWCASE_DEMAND }),
  (hub) => ({ reason: 'not_ordered', sellerGst: false, sellerState: hub.state, unopened: true, sealOk: false, sellerOptedIn: true, invoiceOutside: true, demandRate: SHOWCASE_DEMAND }),
]

/** `reason` is what the rider recorded when the refusal OTP was verified; without one the seeded assumption decides. */
export function buildParcel(stop: StopRecord, hub: Hub, showcaseIndex?: number, reason?: RefusalReason): RefusedParcel {
  const rng = createRng(hashSeed(`parcel-${stop.order.id}`))
  const a = PARCEL_ASSUMPTIONS
  const sellerId = `${stop.order.sellerState}-S${String(rng.int(SELLERS_PER_HUB) + 1).padStart(2, '0')}`
  const skuId = `SKU-${String(rng.int(SKUS_PER_HUB) + 1).padStart(3, '0')}`
  const drawn = drawReason(rng)
  const unopened = rng.chance(a.unopenedShare)
  const sealOk = rng.chance(a.sealOkShare)
  const sellerOptedIn = rng.chance(stop.order.sellerGst ? a.optedInGst : a.optedInNonGst)
  const invoiceOutside = rng.chance(a.invoiceOutsideShare)
  const [lo, hi] = rng.chance(a.highDemandShare) ? a.highDemandRate : a.lowDemandRate
  const demandRate = lo + rng.next() * (hi - lo)
  const base: RefusedParcel = {
    id: `P-${stop.order.id}`,
    awb: stop.order.awb,
    hubId: hub.id,
    hubState: hub.state,
    buyerState: hub.state,
    sellerId,
    sellerState: stop.order.sellerState,
    sellerGst: stop.order.sellerGst,
    skuId,
    value: stop.order.value,
    reason: reason ?? drawn,
    unopened,
    sealOk,
    sellerOptedIn,
    invoiceOutside,
    demandRate,
  }
  const show = showcaseIndex === undefined ? undefined : SHOWCASE[showcaseIndex]
  // The showcase fixes the gates and the demand of the four demo parcels; a reason the rider actually recorded always wins.
  return show ? { ...base, ...show(hub), ...(reason ? { reason } : {}) } : base
}
