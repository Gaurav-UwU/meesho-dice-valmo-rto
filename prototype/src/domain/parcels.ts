import { catalogueFor, skuIdFor, SKUS_PER_HUB } from '../engine/catalogue.ts'
import { forecastFor } from '../engine/demand.ts'
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
} as const

const SELLERS_PER_HUB = 40

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
  const skuId = skuIdFor(rng.int(SKUS_PER_HUB) + 1)
  const drawn = drawReason(rng)
  const unopened = rng.chance(a.unopenedShare)
  const sealOk = rng.chance(a.sealOkShare)
  const sellerOptedIn = rng.chance(stop.order.sellerGst ? a.optedInGst : a.optedInNonGst)
  const invoiceOutside = rng.chance(a.invoiceOutsideShare)
  // The listing's hidden true buyer rate is the simulation's truth; the Router gets only the forecast built from the listing's 14-day history.
  const demandRate = catalogueFor(hub.id).find((x) => x.skuId === skuId)?.trueRate ?? 0
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
    forecast: forecastFor(hub.id, skuId),
  }
  const show = showcaseIndex === undefined ? undefined : SHOWCASE[showcaseIndex]
  if (!show) return base
  // The showcase fixes the gates and the demand of the four demo parcels; a reason the rider actually recorded always wins.
  const shown = { ...base, ...show(hub), ...(reason ? { reason } : {}) }
  // A demo parcel with its own hidden rate replays that listing with a matching history, so its forecast agrees with the story.
  return shown.demandRate === demandRate ? shown : { ...shown, forecast: forecastFor(hub.id, skuId, { rate: shown.demandRate }) }
}
