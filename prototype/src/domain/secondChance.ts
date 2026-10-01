import { hashSeed } from '../engine/rng.ts'
import { DAY_MS, HOUR_MS, nextDayStart } from './clock.ts'
import { emit } from './events.ts'
import { bookCost, bookSecondChanceLeg, feedAdd, moveOrder, msgAdd, patchParcel, patchStop, proactiveCount, REVERSE_COST, sendProactive, tap, bookSaving, type S } from './helpers.ts'
import { HOLD_COST, attemptLeft, decisionFor, findParcel, laneLogged, shelfUsed } from './routing.ts'
import { WHEN_BUTTONS, laterAck, pickupFullAck, pickupText, secondChanceButtons, secondChanceText, whenText, PAY_BUTTONS, replyAck } from './messages.ts'
import type { Action, ParcelRecord, SecondChanceChoice } from './types.ts'

/** The customer has five tries at the pickup code. */
export const MAX_PICKUP_TRIES = 5

const hubName = (s: S): string => s.hub.name.split('·').pop()?.trim() ?? s.hub.name

/** The Desk sends the second-chance WhatsApp. A pickup is offered only while the shelf has a free slot right now; Pay now only on a COD order. */
export function deskSecondChance(s: S, a: Extract<Action, { type: 'deskSecondChance' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'queued') return s
  // Only while the second chance is the lane on offer: not after a decline, an expiry, a skip, or when no attempt is left.
  const decision = decisionFor(s, p)
  if (decision.lane !== 'second_chance') return s
  const st = s.stops[p.orderId]
  const pickupOffered = shelfUsed(s) < s.router.shelfCapacity
  // The message goes first. If the 4-message cap rejects it, nothing is marked as sent (the parcel stays in the queue).
  const sent = sendProactive(s, {
    orderId: p.orderId,
    at: a.at,
    direction: 'out',
    kind: 'second_chance',
    text: secondChanceText(st.order.awb),
    buttons: secondChanceButtons({ pay: st.order.payment !== 'PREPAID', pickup: pickupOffered }),
  })
  if (proactiveCount(sent, p.orderId) === proactiveCount(s, p.orderId)) {
    return feedAdd(sent, a.at, 'desk', `Second chance not sent for ${st.order.awb}: the order already had ${proactiveCount(s, p.orderId)} WhatsApp messages (the cap). Skip it with a reason to move to the next lane`, p.orderId)
  }
  let next = laneLogged(sent, a.at, p, decision)
  next = patchParcel(next, p.id, { state: 'second_chance_sent', secondChanceSentSim: s.simNow, pickupOffered })
  next = emit(next, a.at, 'SECOND_CHANCE_SENT', {}, { orderId: p.orderId })
  return feedAdd(next, a.at, 'desk', `Second-chance WhatsApp sent for ${st.order.awb}. The customer has ${s.router.secondChanceHours} h to answer`, p.orderId)
}

/** The refusal stays on the record (failedAttempts = 1); the order goes out again as attempt 2 in the same arm. The ₹21 leg books now, the ₹120 saving only if it is delivered. */
function deliverAgain(s: S, p: ParcelRecord, at: number, choice: SecondChanceChoice, why: string): S {
  // A second chance is another attempt: it may never exceed maxAttempts. The parcel goes to the next lane instead.
  if (!attemptLeft(s, p)) return noAttemptLeft(s, p, at)
  let next = patchParcel(s, p.id, { state: 'recovered', choice, awaiting: undefined })
  next = moveOrder(next, p.orderId, 'out_for_delivery', { at, reason: why, patch: { viaSecondChance: true, paymentPending: false } })
  next = emit(next, at, 'SECOND_CHANCE_ACCEPTED', {}, { orderId: p.orderId })
  // The ₹21 leg is spent now; the ₹120 return avoided books only if the order is delivered, so a failed second chance shows its cost.
  next = bookSecondChanceLeg(next, p.orderId, at)
  return feedAdd(next, at, 'desk', 'Customer accepted the second chance: back in the bag as attempt 2 (the ₹21 leg is booked now; the ₹120 return is avoided only if it is delivered)', p.orderId)
}

/** The customer said yes but no attempt is left: the parcel goes back to the queue and the Router offers the next lane. */
function noAttemptLeft(s: S, p: ParcelRecord, at: number): S {
  const next = patchParcel(s, p.id, { state: 'queued', awaiting: undefined })
  return feedAdd(next, at, 'desk', `No attempt left for ${p.parcel.awb} (the cap is ${s.config.maxAttempts}): routed to the next lane instead of going out again`, p.orderId)
}

/** A different time: parked until 08:00 on the chosen day, then out as attempt 2. This is not a customer reschedule, so it never counts toward the reschedule cap. */
function deliverLater(s: S, p: ParcelRecord, at: number, day: 'tomorrow' | 'day_after'): S {
  if (!attemptLeft(s, p)) return noAttemptLeft(s, p, at)
  const to = nextDayStart(s.simNow) + (day === 'day_after' ? DAY_MS : 0)
  let next = patchParcel(s, p.id, { state: 'recovered', choice: 'later', awaiting: undefined })
  next = moveOrder(next, p.orderId, 'rescheduled', { at, reason: 'second chance: a different time', patch: { viaSecondChance: true, rescheduledTo: to } })
  next = emit(next, at, 'SECOND_CHANCE_ACCEPTED', {}, { orderId: p.orderId })
  next = emit(next, at, 'RESCHEDULED', { toSimAt: to }, { orderId: p.orderId })
  next = msgAdd(next, { orderId: p.orderId, at, direction: 'out', kind: 'second_chance_ack', text: laterAck(day) })
  return feedAdd(next, at, 'desk', `Customer chose a different time (${day === 'day_after' ? 'the day after tomorrow' : 'tomorrow'}): parked until then, then attempt 2`, p.orderId)
}

/** The code is four digits from the parcel and the day's seed: the same in every run of the same day. */
const pickupCodeFor = (s: S, p: ParcelRecord): string => String(1000 + (hashSeed(`pickup-${p.id}-${s.seed}`) % 9000))

/** The parcel stays on the hub shelf for the pickup window. The ₹8 is booked now; the ₹120 saving only when it is collected. */
function reservePickup(s: S, p: ParcelRecord, at: number): S {
  const code = pickupCodeFor(s, p)
  const deadline = s.simNow + s.router.pickupHours * HOUR_MS
  let next = patchParcel(s, p.id, { state: 'pickup_reserved', choice: 'pickup', awaiting: undefined, pickup: { code, deadline, reservedSim: s.simNow, tries: 0 } })
  next = emit(next, at, 'PICKUP_RESERVED', { deadline, slot: shelfUsed(next), capacity: s.router.shelfCapacity }, { orderId: p.orderId })
  next = bookCost(next, at, 'Hub pickup shelf slot (48h)', HOLD_COST, 'Valmo', 'router', p.orderId)
  // The instructions and the code are the reply to the customer's own tap, so this is not one of the four proactive messages.
  next = msgAdd(next, { orderId: p.orderId, at, direction: 'out', kind: 'pickup_code', text: pickupText(code, hubName(s), s.router.pickupHours) })
  return feedAdd(next, at, 'desk', `${p.parcel.awb} kept at the hub for ${s.router.pickupHours} h for the customer to collect (shelf slot reserved)`, p.orderId)
}

const TAP_LABEL = { deliver: '🔁 Deliver again', later: '🕐 Different time', tomorrow: 'Tomorrow', day_after: 'Day after tomorrow', pay: '💳 Pay now by UPI', pickup: '🏬 Pick up at hub' } as const

/** The customer answers the second-chance WhatsApp. Declining (accept false) sends the parcel on to the next lane. */
export function customerSecondChance(s: S, a: Extract<Action, { type: 'customerSecondChance' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'second_chance_sent') return s
  const st = s.stops[p.orderId]
  if (!a.accept) {
    let declined = tap(s, a.at, p.orderId, '❌ Cancel order')
    declined = patchParcel(declined, p.id, { state: 'queued', secondChanceDeclined: true, awaiting: undefined })
    if (st.paymentPending) declined = patchStop(declined, p.orderId, { paymentPending: false })
    return feedAdd(declined, a.at, 'desk', 'Customer declined the second chance: parcel re-routed', p.orderId)
  }
  const option = a.option ?? 'deliver'
  let next = tap(s, a.at, p.orderId, TAP_LABEL[option])
  switch (option) {
    case 'deliver':
      return deliverAgain(next, p, a.at, 'deliver', 'second chance accepted')
    case 'later':
      next = patchParcel(next, p.id, { awaiting: 'when' })
      return msgAdd(next, { orderId: p.orderId, at: a.at, direction: 'out', kind: 'second_chance_when', text: whenText, buttons: WHEN_BUTTONS })
    case 'tomorrow':
    case 'day_after':
      return deliverLater(next, p, a.at, option)
    case 'pay': {
      // Offered on COD orders only; a prepaid order has nothing to pay.
      if (st.order.payment === 'PREPAID') return s
      next = patchStop(next, p.orderId, { paymentPending: true })
      next = patchParcel(next, p.id, { awaiting: 'pay' })
      return msgAdd(next, { orderId: p.orderId, at: a.at, direction: 'out', kind: 'second_chance_pay', text: replyAck.pay_now, buttons: PAY_BUTTONS })
    }
    case 'pickup': {
      if (!p.pickupOffered) return s
      // The shelf is checked again now: it may have filled since the offer went out. Then the customer gets a different time instead.
      if (shelfUsed(s) >= s.router.shelfCapacity) {
        next = msgAdd(next, { orderId: p.orderId, at: a.at, direction: 'out', kind: 'second_chance_ack', text: pickupFullAck })
        return deliverLater(next, p, a.at, 'tomorrow')
      }
      return reservePickup(next, p, a.at)
    }
  }
}

/**
 * The customer's payment, asked for by the Pay now option, has a result. Paid: the order is prepaid (the payment action set that) and goes out
 * as attempt 2. Failed: it still goes out, cash on delivery, as the failure message says. Called by the payment action, after it has run.
 */
export function afterSecondChancePayment(s: S, orderId: string, at: number): S {
  const p = s.parcels.find((x) => x.orderId === orderId && x.state === 'second_chance_sent' && x.awaiting === 'pay')
  if (!p) return s
  return deliverAgain(s, p, at, 'pay', 'second chance: the customer paid, or will pay cash')
}

/** The customer is at the counter with their code. Right code: the sale is saved and the order ends as a hub pickup (never a delivery, never a bonus). */
export function deskHandover(s: S, a: Extract<Action, { type: 'deskHandover' }>): S {
  const p = findParcel(s, a.parcelId)
  if (!p || p.state !== 'pickup_reserved' || !p.pickup) return s
  if (p.pickup.tries >= MAX_PICKUP_TRIES || s.simNow >= p.pickup.deadline) return s
  if (a.code !== p.pickup.code) {
    const tries = p.pickup.tries + 1
    const next = patchParcel(s, p.id, { pickup: { ...p.pickup, tries } })
    return feedAdd(next, a.at, 'desk', `Wrong pickup code for ${p.parcel.awb} (${tries}/${MAX_PICKUP_TRIES} tries)`, p.orderId)
  }
  let next = moveOrder(s, p.orderId, 'hub_pickup', { at: a.at, reason: 'the customer collected the parcel at the hub' })
  if (next.stops[p.orderId].status !== 'hub_pickup') return next
  next = patchParcel(next, p.id, { state: 'picked_up', pickup: { ...p.pickup, collectedSim: s.simNow, cashCollected: a.cashCollected === true } })
  next = emit(next, a.at, 'PICKUP_COLLECTED', { codeVerified: true }, { orderId: p.orderId })
  next = bookSaving(next, a.at, 'Hub pickup collected', REVERSE_COST, p.orderId)
  const cash = a.cashCollected === true ? ' Cash collected at the hub (noted, no rider involved).' : ''
  return feedAdd(next, a.at, 'desk', `${p.parcel.awb} collected by the customer at the hub (code verified): the ₹${REVERSE_COST} return is avoided.${cash}`, p.orderId)
}
