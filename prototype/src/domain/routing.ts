import { rescueScore } from '../engine/rescue.ts'
import { createRng, hashSeed } from '../engine/rng.ts'
import { routeParcel, REFUSAL_REASONS, type RouteDecision, type RouteOptions } from '../engine/router.ts'
import type { Order } from '../engine/types.ts'
import { HOUR_MS } from './clock.ts'
import { emit } from './events.ts'
import { bookCost, bookSaving, feedAdd, moveOrder, patchParcel, REVERSE_COST, sendProactive, tap, type S } from './helpers.ts'
import { SECOND_CHANCE_BUTTONS, secondChanceText } from './messages.ts'
import type { Action, ParcelRecord, RouterParamKey, StopRecord } from './types.ts'

/** How many open stops one rider's bag can hold, for the "rider bag space" gate */
export const RIDER_BAG_CAPACITY = 35
/** ₹ to keep a parcel on the shelf for the hold window (case data pack) */
export const HOLD_COST = 8
/** ₹ saved when a held parcel is re-homed and delivered (case data pack) */
export const REHOME_SAVING = 145
/** ₹ of a local delivery to the new buyer */
export const REHOME_DELIVERY_COST = 21
/** ₹ net saved when a second chance is delivered: the ₹120 return avoided less the ₹21 leg */
export const SECOND_CHANCE_SAVING = 99

const OPEN_FOR_BAG = new Set(['scored', 'out_for_delivery', 'otp_sent', 'ndr', 'rescheduled'])

const openLoad = (s: S, riderId: string): number => s.stopOrder.filter((id) => s.stops[id].riderId === riderId && OPEN_FOR_BAG.has(s.stops[id].status)).length

export const shelfUsed = (s: S): number => s.parcels.filter((p) => p.state === 'held').length

/** Everything about the day the Router needs beyond the parcel itself */
export function routeOptionsFor(s: S, rec: ParcelRecord): RouteOptions {
  return {
    params: s.router,
    shelfUsed: shelfUsed(s),
    riderHasSpace: s.riders.some((r) => openLoad(s, r.id) < RIDER_BAG_CAPACITY),
    secondChanceDeclined: rec.secondChanceDeclined,
    secondChanceExpired: rec.secondChanceExpired,
  }
}

export const decisionFor = (s: S, rec: ParcelRecord): RouteDecision => routeParcel(rec.parcel, routeOptionsFor(s, rec))

const laneLogged = (s: S, at: number, rec: ParcelRecord, d: RouteDecision): S =>
  emit(s, at, 'ROUTER_LANE', { lane: d.lane, ev: d.ev, inputs: d.inputs }, { orderId: rec.orderId })

const findParcel = (s: S, parcelId: string): ParcelRecord | undefined => s.parcels.find((p) => p.id === parcelId)

export function deskSecondChance(s: S, a: Extract<Action, { type: 'deskSecondChance' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'queued') return s
  const st = s.stops[p.orderId]
  let next = laneLogged(s, a.at, p, decisionFor(s, p))
  next = patchParcel(next, p.id, { state: 'second_chance_sent', secondChanceSentSim: s.simNow })
  next = emit(next, a.at, 'SECOND_CHANCE_SENT', {}, { orderId: p.orderId })
  next = sendProactive(next, { orderId: p.orderId, at: a.at, direction: 'out', kind: 'second_chance', text: secondChanceText(st.order.awb), buttons: SECOND_CHANCE_BUTTONS })
  return feedAdd(next, a.at, 'desk', `Second-chance WhatsApp sent for ${st.order.awb}. The customer has ${s.router.secondChanceHours} h to answer`, p.orderId)
}

export function customerSecondChance(s: S, a: Extract<Action, { type: 'customerSecondChance' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'second_chance_sent') return s
  let next = tap(s, a.at, p.orderId, a.accept ? '🔁 Deliver again' : '❌ Cancel order')
  if (a.accept) {
    // The refusal stays on the record (failedAttempts = 1); the order goes back out as attempt 2 in the same arm.
    next = patchParcel(next, p.id, { state: 'recovered' })
    next = moveOrder(next, p.orderId, 'out_for_delivery', { at: a.at, reason: 'second chance accepted', patch: { viaSecondChance: true } })
    next = emit(next, a.at, 'SECOND_CHANCE_ACCEPTED', {}, { orderId: p.orderId })
    return feedAdd(next, a.at, 'desk', 'Customer accepted the second chance: back in the bag as attempt 2 (the ₹120 return is avoided only if it is delivered)', p.orderId)
  }
  next = patchParcel(next, p.id, { state: 'queued', secondChanceDeclined: true })
  return feedAdd(next, a.at, 'desk', 'Customer declined the second chance: parcel re-routed', p.orderId)
}

/** A second chance that ended in a delivery books its net saving, and only then. */
export function secondChanceDelivered(s: S, orderId: string, at: number): S {
  return s.stops[orderId]?.viaSecondChance ? bookSaving(s, at, 'Second chance delivered (net of the ₹21 leg)', SECOND_CHANCE_SAVING, orderId) : s
}

const EDITABLE_GATES = new Set(['unopened', 'sealOk', 'invoiceOutside'])

/** Demo what-if on a queued parcel. The seller's opt-in is never editable: only the seller decides. */
export function deskSetGate(s: S, a: Extract<Action, { type: 'deskSetGate' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'queued' || !EDITABLE_GATES.has(a.gate)) return s
  return patchParcel(s, p.id, { parcel: { ...p.parcel, [a.gate]: a.value } })
}

/** Change a Router assumption. Bounded so a typo cannot break the maths. */
export function deskSetParam(s: S, a: Extract<Action, { type: 'deskSetParam' }>): S {
  const value = a.value
  if (!Number.isFinite(value)) return s
  const key: RouterParamKey = a.param
  if (key === 'conversion') return { ...s, router: { ...s.router, conversion: Math.min(1, Math.max(0, value)) } }
  if (key === 'shelfCapacity') return { ...s, router: { ...s.router, shelfCapacity: Math.min(500, Math.max(0, Math.round(value))) } }
  const reason = key.slice('accept_'.length)
  const known = REFUSAL_REASONS.find((r) => r === reason)
  if (!known) return s
  return { ...s, router: { ...s.router, acceptByReason: { ...s.router.acceptByReason, [known]: Math.min(1, Math.max(0, value)) } } }
}

/** When (sim time) a buyer for a held parcel appears, drawn once from an exponential clock; none if nobody comes within the hold window */
function drawMatchAt(s: S, rec: ParcelRecord): number | undefined {
  const rate = rec.parcel.demandRate * s.router.conversion
  if (rate <= 0) return undefined
  const hours = -Math.log(1 - createRng(hashSeed(`hold-${rec.id}`)).next()) / rate
  return hours <= s.router.holdHours ? s.simNow + hours * HOUR_MS : undefined
}

export function deskHold(s: S, a: Extract<Action, { type: 'deskHold' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'queued') return s
  const d = decisionFor(s, p)
  if (d.lane !== 'hold_rehome') return s
  let next = laneLogged(s, a.at, p, d)
  next = patchParcel(next, p.id, { state: 'held', heldSim: s.simNow, matchAt: drawMatchAt(s, p) })
  next = emit(next, a.at, 'HELD', {}, { orderId: p.orderId })
  next = bookCost(next, a.at, 'Hold on shelf (48h)', HOLD_COST, 'Valmo', 'router', p.orderId)
  return feedAdd(next, a.at, 'desk', `${p.parcel.awb} held ${s.router.holdHours}h for a same-state match (about ₹${HOLD_COST})`, p.orderId)
}

/** The rider with the lightest bag that still has room, ties by id */
function rehomeRider(s: S): string | undefined {
  const pool = s.riders.filter((r) => openLoad(s, r.id) < RIDER_BAG_CAPACITY).sort((x, y) => openLoad(s, x.id) - openLoad(s, y.id) || (x.id < y.id ? -1 : 1))
  return pool[0]?.id
}

/** A buyer appeared: the re-homed parcel becomes a NEW order in its own cohort (no arm, not flagged, outside the pilot metrics). */
function createRehomeOrder(s: S, p: ParcelRecord, at: number): S {
  const riderId = rehomeRider(s)
  if (!riderId) return s
  const rng = createRng(hashSeed(`b2-${p.id}`))
  const orig = s.stops[p.orderId].order
  const id = `${p.orderId}-B2`
  const newAwb = `SYNRH${String(s.nextId).padStart(6, '0')}`
  const order: Order = {
    ...orig,
    id,
    awb: newAwb,
    lat: s.hub.lat + (rng.next() - 0.5) * 0.08,
    lng: s.hub.lng + (rng.next() - 0.5) * 0.08,
    distanceKm: Math.round((1 + rng.next() * 6) * 10) / 10,
    payment: 'COD',
    addressQuality: 'clear',
    phoneReachable: true,
    pastFailedAttempts: 0,
    trustmesh: 0.2,
  }
  const seq = Math.max(0, ...s.stopOrder.filter((sid) => s.stops[sid].riderId === riderId).map((sid) => s.stops[sid].seq)) + 1
  const stop: StopRecord = {
    order,
    pRto: 0.1,
    score: rescueScore(order),
    flagged: false,
    riderId,
    seq,
    status: 'out_for_delivery',
    failedAttempts: 0,
    originalRiderId: riderId,
    replies: [],
    answers: { riderReached: null, askedReschedule: null },
    reschedules: 0,
    manual: false,
    rehomedFrom: p.orderId,
  }
  let next: S = { ...s, stops: { ...s.stops, [id]: stop }, stopOrder: [...s.stopOrder, id] }
  next = patchParcel(next, p.id, { state: 'rehomed', newAwb, rehomedStopId: id })
  next = emit(next, at, 'ORDER_SCORED', { score: stop.score, flagged: false }, { orderId: id })
  next = emit(next, at, 'ORDER_DISPATCHED', { riderId, arm: 'none', attempt: 1 }, { orderId: id, riderId })
  next = emit(next, at, 'MATCHED', { newOrderId: id }, { orderId: p.orderId })
  next = bookCost(next, at, 'Re-home local delivery', REHOME_DELIVERY_COST, 'Valmo', 'router', id)
  return feedAdd(next, at, 'desk', `Matched to a nearby buyer: new AWB ${newAwb} is now in ${s.riders.find((r) => r.id === riderId)?.name ?? riderId}'s bag (about ₹${REHOME_SAVING} saved if it is delivered)`, id)
}

/** Demo shortcut: a buyer for the held parcel appears right now. */
export function deskMatch(s: S, a: Extract<Action, { type: 'deskMatch' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'held') return s
  return createRehomeOrder(s, p, a.at)
}

/** Send a parcel back in a consolidated return: the original order ends as an RTO at the batched price, and the batch saving books. */
export function batchParcel(s: S, p: ParcelRecord, at: number, why: string): S {
  let next = patchParcel(s, p.id, { state: 'batched' })
  next = moveOrder(next, p.orderId, 'rto', { at, reason: why, batched: true })
  next = emit(next, at, 'BATCHED', { batchId: p.parcel.sellerId }, { orderId: p.orderId })
  next = bookSaving(next, at, 'Batched return', REVERSE_COST * 0.3, p.orderId)
  return feedAdd(next, at, 'desk', `${p.parcel.awb} added to the consolidated return for seller ${p.parcel.sellerId}`, p.orderId)
}

export function deskConsolidate(s: S, a: Extract<Action, { type: 'deskConsolidate' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'queued') return s
  return batchParcel(laneLogged(s, a.at, p, decisionFor(s, p)), p, a.at, 'batched return')
}

/** The re-homed order was delivered to the new buyer: the original closes as re-homed and the ₹145 books. */
export function rehomeDelivered(s: S, rehomeOrderId: string, at: number): S {
  const st = s.stops[rehomeOrderId]
  const original = st.rehomedFrom === undefined ? undefined : s.stops[st.rehomedFrom]
  if (!original || st.rehomedFrom === undefined) return s
  let next = moveOrder(s, st.rehomedFrom, 'rehomed', { at, reason: 're-homed parcel delivered to the new buyer' })
  if (next.stops[st.rehomedFrom].status !== 'rehomed') return next
  next = emit(next, at, 'REHOME_DELIVERED', {}, { orderId: st.rehomedFrom })
  next = bookSaving(next, at, 'Re-home delivered', REHOME_SAVING, st.rehomedFrom)
  return feedAdd(next, at, 'desk', `Re-homed parcel delivered: ${original.order.awb} is closed as re-homed (return leg avoided)`, st.rehomedFrom)
}

/** The re-homed order failed (refused, or returned after its attempts): the original goes back in a batched return, and no saving books. */
export function failRehome(s: S, rehomeOrderId: string, at: number): S {
  const st = s.stops[rehomeOrderId]
  const rec = s.parcels.find((p) => p.rehomedStopId === rehomeOrderId)
  if (!st || !rec || st.rehomedFrom === undefined) return s
  let next = emit(s, at, 'REHOME_FAILED', {}, { orderId: st.rehomedFrom })
  next = batchParcel(next, rec, at, 'a failed re-home goes back in a batched return')
  return feedAdd(next, at, 'desk', `The re-homed parcel for ${rec.parcel.awb} failed: batched return, no saving booked`, st.rehomedFrom)
}

/** Timers of the Router: a second chance expires after 24 h; a held parcel matches when its buyer appears or expires after 48 h. */
export function parcelTimers(s: S, at: number): S {
  let next = s
  for (const rec of s.parcels) {
    const cur = next.parcels.find((p) => p.id === rec.id) ?? rec
    if (cur.state === 'second_chance_sent' && cur.secondChanceSentSim !== undefined && next.simNow - cur.secondChanceSentSim >= next.router.secondChanceHours * HOUR_MS) {
      next = patchParcel(next, cur.id, { state: 'queued', secondChanceExpired: true })
      next = emit(next, at, 'SECOND_CHANCE_EXPIRED', {}, { orderId: cur.orderId })
      next = feedAdd(next, at, 'desk', `No answer to the second chance for ${cur.parcel.awb} in ${next.router.secondChanceHours} h: routed to the next lane`, cur.orderId)
    } else if (cur.state === 'held' && cur.heldSim !== undefined) {
      if (cur.matchAt !== undefined && cur.matchAt <= next.simNow) {
        next = createRehomeOrder(next, cur, at)
      } else if (next.simNow - cur.heldSim >= next.router.holdHours * HOUR_MS) {
        next = emit(next, at, 'HOLD_EXPIRED', {}, { orderId: cur.orderId })
        next = batchParcel(next, cur, at, `no buyer in ${next.router.holdHours} h`)
      }
    }
  }
  return next
}

