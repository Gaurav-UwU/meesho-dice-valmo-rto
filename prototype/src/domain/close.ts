import { createRng, hashSeed } from '../engine/rng.ts'
import { pAccept } from '../engine/router.ts'
import { drawDay, drawOption, paymentGoesThrough, pickupCollects } from './botCustomer.ts'
import { planAutopilot } from './autopilot.ts'
import { DAY_MS } from './clock.ts'
import { decisionFor } from './routing.ts'
import type { Action, DayState } from './types.ts'

type Reduce = (s: DayState, a: Action) => DayState

/** More rounds than a pilot day ever needs (every failed order gets at most 2 attempts, every parcel 3 lanes) */
const MAX_ROUNDS = 24
/** Share of second-chance offers the simulated customer never answers, so the 24 h expiry runs too (assumption) */
const NO_ANSWER_SHARE = 0.15

/** Work still to do that the bots and the clock can finish. Close pilot also works the stops reserved for a live demo: the demo is over. */
function openWork(s: DayState): number {
  const orders = s.stopOrder.filter((id) => {
    const st = s.stops[id]
    return ['out_for_delivery', 'otp_sent', 'ndr', 'rescheduled', 'refused'].includes(st.status)
  }).length
  const parcels = s.parcels.filter((p) => p.state === 'queued' || p.state === 'second_chance_sent' || p.state === 'held' || p.state === 'pickup_reserved').length
  return orders + parcels + s.exceptions.filter((e) => e.status === 'open').length
}

/** The Desk on the Router's advice: send the offer, and let a seeded customer answer (accept per P(accept | reason), decline, or say nothing). */
function deskRound(s: DayState, at: number, reduce: Reduce): DayState {
  let next = s
  for (const rec of s.parcels) {
    let cur = next.parcels.find((p) => p.id === rec.id)
    if (!cur) continue
    // A customer with a pickup code turns up (or not) before the window closes.
    if (cur.state === 'pickup_reserved' && cur.pickup && pickupCollects(cur.id)) {
      next = reduce(next, { type: 'deskHandover', at, parcelId: cur.id, code: cur.pickup.code, cashCollected: next.stops[cur.orderId].order.payment === 'COD' })
      continue
    }
    if (cur.state !== 'queued') continue
    // The demo is over: the bots inspect whatever the operator has not got to.
    if (!cur.inspection) {
      next = reduce(next, { type: 'deskInspect', at, parcelId: cur.id, unopened: cur.parcel.unopened, sealOk: cur.parcel.sealOk, invoiceOutside: cur.parcel.invoiceOutside, photoNote: 'synthetic', by: 'bot' })
      cur = next.parcels.find((p) => p.id === rec.id) ?? cur
    }
    const lane = decisionFor(next, cur).lane
    if (lane === 'consolidated_return') {
      next = reduce(next, { type: 'deskConsolidate', at, parcelId: cur.id })
    } else if (lane === 'hold_rehome') {
      next = reduce(next, { type: 'deskHold', at, parcelId: cur.id })
    } else {
      next = reduce(next, { type: 'deskSecondChance', at, parcelId: cur.id })
      next = customerAnswers(next, cur.id, at, reduce)
    }
  }
  return next
}

/** A seeded customer answers a second-chance offer: accept (per P(accept | reason)) and then one of the four options, decline, or say nothing. */
function customerAnswers(s: DayState, parcelId: string, at: number, reduce: Reduce): DayState {
  const rec = s.parcels.find((p) => p.id === parcelId)
  if (!rec || rec.state !== 'second_chance_sent') return s
  const u = createRng(hashSeed(`sc-${parcelId}`)).next()
  const accept = pAccept(rec.parcel.reason, s.router)
  if (u >= accept) return u < accept + (1 - accept) * (1 - NO_ANSWER_SHARE) ? reduce(s, { type: 'customerSecondChance', at, parcelId, accept: false }) : s
  const st = s.stops[rec.orderId]
  let option = drawOption(rec.parcel.reason, parcelId)
  // An option that was not on offer (a prepaid order has nothing to pay; the shelf was full) becomes the nearest one that was.
  if (option === 'pay' && st.order.payment === 'PREPAID') option = 'deliver'
  if (option === 'pickup' && !rec.pickupOffered) option = 'later'
  switch (option) {
    case 'later':
      return reduce(s, { type: 'customerSecondChance', at, parcelId, accept: true, option: drawDay(parcelId) })
    case 'pay': {
      const asked = reduce(s, { type: 'customerSecondChance', at, parcelId, accept: true, option: 'pay' })
      return reduce(asked, { type: 'customerPayment', at, orderId: rec.orderId, ok: paymentGoesThrough(parcelId) })
    }
    default:
      return reduce(s, { type: 'customerSecondChance', at, parcelId, accept: true, option })
  }
}

/**
 * Run the rest of the pilot: the bots work every open order, the Desk follows the Router, and the clock moves a day at a time
 * (so second chances expire, holds match or expire, failed attempts are retried or closed) until nothing is left; then it
 * advances past the 7-day return window so bonuses release. Deterministic for a day.
 */
export function closePilot(s0: DayState, at: number, reduce: Reduce): DayState {
  let s = s0
  for (let round = 0; round < MAX_ROUNDS && openWork(s) > 0; round++) {
    s = planAutopilot(s, { count: 100_000, seed: s0.seed + round, at, includeManual: true }).reduce(reduce, s)
    s = deskRound(s, at, reduce)
    s = reduce(s, { type: 'advanceDay', at })
  }
  return reduce(s, { type: 'advanceClock', at, minutes: (8 * DAY_MS) / 60_000 })
}
