import { rescueScore } from '../engine/rescue.ts'
import { createRng, hashSeed } from '../engine/rng.ts'
import { isSoftReason, routeParcel, REFUSAL_REASONS, SKIP_REASONS, type Inspection, type RouteDecision, type RouteOptions, type RouterParams } from '../engine/router.ts'
import type { Order } from '../engine/types.ts'
import { HOUR_MS } from './clock.ts'
import { emit } from './events.ts'
import { bookCost, bookSaving, feedAdd, moveOrder, patchParcel, patchStop, REVERSE_COST, type S } from './helpers.ts'
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

/** Parcels on the shelf: held for a re-home, or reserved for a customer's pickup. They share one set of slots. */
export const shelfUsed = (s: S): number => s.parcels.filter((p) => p.state === 'held' || p.state === 'pickup_reserved').length

/** Everything about the day the Router needs beyond the parcel itself */
export function routeOptionsFor(s: S, rec: ParcelRecord): RouteOptions {
  return {
    params: s.router,
    shelfUsed: shelfUsed(s),
    riderHasSpace: s.riders.some((r) => openLoad(s, r.id) < RIDER_BAG_CAPACITY),
    secondChanceDeclined: rec.secondChanceDeclined,
    secondChanceExpired: rec.secondChanceExpired,
    // Skipped by the operator, or no attempt is left (a second chance is attempt N+1 and may never exceed maxAttempts): the parcel moves to the next lane.
    secondChanceSkipped: rec.skipReason !== undefined || !attemptLeft(s, rec),
    inspection: rec.inspection ?? null,
  }
}

/** A second chance sends the order out again as another attempt, so one must be left. */
export const attemptLeft = (s: S, rec: ParcelRecord): boolean => (s.stops[rec.orderId]?.failedAttempts ?? 0) < s.config.maxAttempts

export const decisionFor = (s: S, rec: ParcelRecord): RouteDecision => routeParcel(rec.parcel, routeOptionsFor(s, rec))

export const laneLogged = (s: S, at: number, rec: ParcelRecord, d: RouteDecision): S =>
  emit(s, at, 'ROUTER_LANE', { lane: d.lane, ev: d.ev, inputs: d.inputs }, { orderId: rec.orderId })

export const findParcel = (s: S, parcelId: string): ParcelRecord | undefined => s.parcels.find((p) => p.id === parcelId)

const PHOTO_NOTE_MAX = 80

/** Write the inspection on the parcel and log it. The one place an inspection is made, for the operator and for the bots. */
function recordInspection(s: S, p: ParcelRecord, found: Pick<Inspection, 'unopened' | 'sealOk' | 'invoiceOutside' | 'photoNote'>, by: string, at: number): S {
  const inspection: Inspection = { ...found, at: s.simNow, by }
  let next = patchParcel(s, p.id, { inspection })
  next = emit(next, at, 'PARCEL_INSPECTED', { unopened: found.unopened, sealOk: found.sealOk, invoiceOutside: found.invoiceOutside, by }, { orderId: p.orderId })
  const seen = [found.unopened ? 'unopened' : 'opened', found.sealOk ? 'seal intact' : 'seal broken', found.invoiceOutside ? 'invoice outside' : 'invoice inside'].join(', ')
  return feedAdd(next, at, 'desk', `${p.parcel.awb} inspected by ${by}: ${seen}`, p.orderId)
}

export const BOT_INSPECTOR = 'Bot (synthetic)'
export const OPERATOR = 'Hub operator'

/** Hub operator inspects a parcel that is still waiting in the queue. It can be corrected until a lane is chosen. */
export function deskInspect(s: S, a: Extract<Action, { type: 'deskInspect' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'queued') return s
  const note = (a.photoNote ?? '').slice(0, PHOTO_NOTE_MAX)
  return recordInspection(s, p, { unopened: a.unopened, sealOk: a.sealOk, invoiceOutside: a.invoiceOutside, photoNote: note }, a.by === 'bot' ? BOT_INSPECTOR : OPERATOR, a.at)
}

/** Simulated riders' parcels are inspected straight away with the synthetic facts (the values the inspection would find). */
export function autoInspect(s: S, parcelId: string, at: number): S {
  const p = findParcel(s, parcelId)
  if (!p || p.state !== 'queued' || p.inspection) return s
  return recordInspection(s, p, { unopened: p.parcel.unopened, sealOk: p.parcel.sealOk, invoiceOutside: p.parcel.invoiceOutside, photoNote: 'synthetic' }, BOT_INSPECTOR, at)
}

/** The operator skips the second chance, with a reason. Only while it is the lane on offer; no message is sent and no gate is touched. */
export function deskSkipSecondChance(s: S, a: Extract<Action, { type: 'deskSkipSecondChance' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'queued' || p.skipReason !== undefined || !SKIP_REASONS.includes(a.reason)) return s
  if (decisionFor(s, p).lane !== 'second_chance') return s
  let next = patchParcel(s, p.id, { skipReason: a.reason })
  next = emit(next, a.at, 'SECOND_CHANCE_SKIPPED', { reason: a.reason }, { orderId: p.orderId })
  return feedAdd(next, a.at, 'desk', `Second chance skipped for ${p.parcel.awb} (${a.reason.replace(/_/g, ' ')}): routed to the next lane`, p.orderId)
}

/** A second chance that ended in a delivery books the gross ₹120 return avoided, and only then. The ₹21 leg was booked as a cost when the order went back out. */
export function secondChanceDelivered(s: S, orderId: string, at: number): S {
  return s.stops[orderId]?.viaSecondChance ? bookSaving(s, at, 'Second chance delivered (₹120 return avoided)', REVERSE_COST, orderId) : s
}

const SOFT_REASONS = REFUSAL_REASONS.filter(isSoftReason)

/** The one number the three soft-refusal rows share, or null ("mixed") when an operator has set them apart. */
export function softAcceptRate(params: RouterParams): number | null {
  const [first, ...rest] = SOFT_REASONS.map((r) => params.acceptByReason[r])
  return rest.every((v) => v === first) ? first : null
}

/** Change a Router assumption. Bounded so a typo cannot break the maths. */
export function deskSetParam(s: S, a: Extract<Action, { type: 'deskSetParam' }>): S {
  if (!Number.isFinite(a.value)) return s
  const key: RouterParamKey = a.param
  const unit = Math.min(1, Math.max(0, a.value))
  if (key === 'conversion') return { ...s, router: { ...s.router, conversion: unit } }
  if (key === 'shelfCapacity') return { ...s, router: { ...s.router, shelfCapacity: Math.min(500, Math.max(0, Math.round(a.value))) } }
  if (key === 'accept_soft') return { ...s, router: { ...s.router, acceptByReason: { ...s.router.acceptByReason, ...Object.fromEntries(SOFT_REASONS.map((r) => [r, unit])) } } }
  const known = REFUSAL_REASONS.find((r) => r === key.slice('accept_'.length))
  if (!known) return s
  return { ...s, router: { ...s.router, acceptByReason: { ...s.router.acceptByReason, [known]: unit } } }
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
  // The slot this hold takes and the capacity at this moment: the Audit checks the shelf was never over capacity when a slot was taken.
  next = emit(next, a.at, 'HELD', { slot: shelfUsed(next), capacity: s.router.shelfCapacity }, { orderId: p.orderId })
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
export function batchParcel(s: S, p: ParcelRecord, at: number, why: string, opts: { readonly saving?: boolean } = {}): S {
  let next = patchParcel(s, p.id, { state: 'batched' })
  next = moveOrder(next, p.orderId, 'rto', { at, reason: why, batched: true })
  next = emit(next, at, 'BATCHED', { batchId: p.parcel.sellerId }, { orderId: p.orderId })
  // A failed re-home goes back in a batch too, but it is not a saving: the re-home that was meant to avoid the return did not happen.
  if (opts.saving !== false) next = bookSaving(next, at, 'Batched return', REVERSE_COST * 0.3, p.orderId)
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
  next = batchParcel(next, rec, at, 'a failed re-home goes back in a batched return', { saving: false })
  return feedAdd(next, at, 'desk', `The re-homed parcel for ${rec.parcel.awb} failed: batched return, no saving booked`, st.rehomedFrom)
}

/** Timers of the Router: a second chance expires after 24 h; a held parcel matches when its buyer appears or expires after 48 h; a pickup not collected in 48 h goes back in a batched return. */
export function parcelTimers(s: S, at: number): S {
  let next = s
  for (const rec of s.parcels) {
    const cur = next.parcels.find((p) => p.id === rec.id) ?? rec
    if (cur.state === 'second_chance_sent' && cur.secondChanceSentSim !== undefined && next.simNow - cur.secondChanceSentSim >= next.router.secondChanceHours * HOUR_MS) {
      next = patchParcel(next, cur.id, { state: 'queued', secondChanceExpired: true, awaiting: undefined })
      if (next.stops[cur.orderId]?.paymentPending) next = patchStop(next, cur.orderId, { paymentPending: false })
      next = emit(next, at, 'SECOND_CHANCE_EXPIRED', {}, { orderId: cur.orderId })
      next = feedAdd(next, at, 'desk', `No answer to the second chance for ${cur.parcel.awb} in ${next.router.secondChanceHours} h: routed to the next lane`, cur.orderId)
    } else if (cur.state === 'pickup_reserved' && cur.pickup !== undefined && next.simNow >= cur.pickup.deadline) {
      next = emit(next, at, 'PICKUP_EXPIRED', {}, { orderId: cur.orderId })
      next = batchParcel(next, cur, at, `not collected within ${next.router.pickupHours} h`)
    } else if (cur.state === 'held' && cur.heldSim !== undefined) {
      const matched = cur.matchAt !== undefined && cur.matchAt <= next.simNow ? createRehomeOrder(next, cur, at) : undefined
      if (matched !== undefined && matched !== next) {
        next = matched
      } else if (next.simNow - cur.heldSim >= next.router.holdHours * HOUR_MS) {
        // No buyer, or a buyer appeared but no rider has room in the bag: either way the 48 h hold window still ends.
        next = emit(next, at, 'HOLD_EXPIRED', {}, { orderId: cur.orderId })
        next = batchParcel(next, cur, at, `no buyer in ${next.router.holdHours} h`)
      }
    }
  }
  return next
}

