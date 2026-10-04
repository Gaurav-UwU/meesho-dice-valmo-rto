import { assessAttempt, attemptConfidence, type AttemptEvidence } from '../engine/attempts.ts'
import { roadKmEstimate } from '../engine/geo.ts'
import { logit, sigmoid } from '../engine/math.ts'
import { flagBonusEligible, rescueScore } from '../engine/rescue.ts'
import { DAY_MS, MINUTE_MS, nextDayStart } from './clock.ts'
import { closePilot } from './close.ts'
import { emit } from './events.ts'
import { bookSecondChanceLeg, feedAdd, moveOrder, msgAdd, patchStop, riderName, sendProactive, tap, type S } from './helpers.ts'
import { accrueBonus, clawBack, reconcileCod } from './ledger.ts'
import { deliveredStatus, isDelivered } from './lifecycle.ts'
import { LANGUAGE_BUTTONS, LANGUAGE_TEXT, daysEarly, orderDayButtons, orderDayTextBoth, replyLabel, waCopy } from './messages.ts'
import { askReview, overturnStrike, reviewBonus } from './captain.ts'
import { callsSinceDispatch, riderCall } from './calls.ts'
import { closeAsRto, confidenceOf, openException, overtakeException, resolveExceptionFor, retryOne } from './orders.ts'
import { buildParcel, SHOWCASE } from './parcels.ts'
import { plannedRuleHash } from './rule.ts'
import { autoInspect, deskConsolidate, deskHold, deskInspect, deskMatch, deskSetParam, deskSkipSecondChance, rehomeDelivered, secondChanceDelivered } from './routing.ts'
import { afterSecondChancePayment, customerSecondChance, deskHandover, deskSecondChance } from './secondChance.ts'
import { OTP_SIM_TTL_MS, tick } from './tick.ts'
import type { Action, DayState, StopRecord } from './types.ts'
import type { Order } from '../engine/types.ts'

/** Assumptions the pilot will measure. Labelled on screen. */
export const PAY_NOW_RTO_FACTOR = 0.5
export const ADDRESS_FIX_LOGIT_DROP = 0.7
/** A customer who says they will be home is a little more likely to take the parcel */
export const HOME_LOGIT_DROP = 0.3
export const MAX_OTP_ATTEMPTS = 5
/** How long five wrong tries lock an order (wall time). It is a cooldown: afterwards the rider gets five fresh tries. */
export const OTP_COOLDOWN_MS = 5 * 60 * 1000
/** A customer's shared location is kept to about 1 km: the day is readable by anyone, and the exact pin is only needed to score the order once. */
const coarse = (x: number): number => Math.round(x * 100) / 100
export const OTP_TTL_MS = 10 * 60 * 1000
const DEMO_FLAGGED_MANUAL = { bonusRider: 6, controlRider: 2 } as const

function startDay(s: S, at: number): S {
  if (s.started) return s
  const orders = s.stopOrder.map((id) => s.stops[id].order)
  const flagged = flagBonusEligible(orders)
  const ruleHash = plannedRuleHash(s.config)
  let next: S = { ...s, started: true, plannedRuleHash: ruleHash }
  // Day dispatch: scored -> out_for_delivery for every order (a legal move). The arm is stamped here, once, from the rider
  // the order is first given to, and is never recomputed, so a later hand-over cannot move an order between arms.
  const stops: Record<string, StopRecord> = { ...s.stops }
  for (const id of s.stopOrder) {
    const st = stops[id]
    stops[id] = { ...st, flagged: flagged.has(id), status: 'out_for_delivery', arm: s.riders.find((r) => r.id === st.riderId)?.arm, originalRiderId: st.riderId }
  }
  next = { ...next, stops }
  next = emit(next, at, 'DAY_PLANNED', { ruleHash, config: s.config })
  for (const id of next.stopOrder) {
    const st = next.stops[id]
    next = emit(next, at, 'ORDER_SCORED', { score: st.score, flagged: st.flagged }, { orderId: id })
    next = emit(next, at, 'ORDER_DISPATCHED', { riderId: st.riderId, arm: st.arm ?? 'none', attempt: 1 }, { orderId: id, riderId: st.riderId })
  }

  // Reserve a few flagged stops of one Bonus rider and one Control rider for the live demo.
  const demo = (arm: 'bonus' | 'control', n: number): string[] => {
    const flaggedOf = (riderId: string): StopRecord[] =>
      next.stopOrder
        .map((id) => next.stops[id])
        .filter((st) => st.riderId === riderId && st.flagged)
        .sort((a, b) => a.seq - b.seq)
    // The demo rider is the one of that arm with the most flagged stops, so there is plenty to show.
    const best = next.riders
      .filter((r) => r.arm === arm)
      .map((r) => ({ rider: r, stops: flaggedOf(r.id) }))
      .reduce<{ rider: (typeof next.riders)[number]; stops: StopRecord[] } | undefined>((top, cur) => (!top || cur.stops.length > top.stops.length ? cur : top), undefined)
    return best ? best.stops.slice(0, n).map((st) => st.order.id) : []
  }
  for (const id of [...demo('bonus', DEMO_FLAGGED_MANUAL.bonusRider), ...demo('control', DEMO_FLAGGED_MANUAL.controlRider)]) {
    next = patchStop(next, id, { manual: true })
  }

  next = feedAdd(next, at, 'day', `Day started: ${orders.length} orders scored, ${flagged.size} marked Bonus-Eligible (top 20%)`)
  for (const id of next.stopOrder) {
    const st = next.stops[id]
    if (!st.flagged) continue
    // The first message is in English and Hindi; the next one asks which language the customer wants from now on (plan 33).
    next = sendProactive(next, {
      orderId: id,
      at,
      direction: 'out',
      kind: 'order_day',
      text: orderDayTextBoth(st.order.awb, st.order.payment === 'COD', st.order.value, daysEarly(st.order.id, st.order.payment === 'COD')),
      buttons: orderDayButtons(st.order.payment === 'COD', daysEarly(st.order.id, st.order.payment === 'COD')),
    })
    // Part of the first contact, so it sits outside the 4-message cap (it would otherwise crowd out a later second chance). Still costed.
    next = msgAdd(next, { orderId: id, at, direction: 'out', kind: 'language_check', text: LANGUAGE_TEXT, buttons: LANGUAGE_BUTTONS })
  }
  return next
}

function customerReply(s: S, a: Extract<Action, { type: 'customerReply' }>): S {
  const st = s.stops[a.orderId]
  if (!st) return s
  const early = daysEarly(st.order.id, st.order.payment === 'COD')
  const label = replyLabel(a.reply, early)
  const wa = waCopy(st.lang)
  let next = tap(s, a.at, a.orderId, label)
  next = patchStop(next, a.orderId, { replies: [...st.replies, a.reply] })
  next = emit(next, a.at, 'CUSTOMER_REPLIED', { reply: a.reply }, { orderId: a.orderId })
  switch (a.reply) {
    case 'home':
      // "I'm home" lowers the odds a little, once. It changes the outcome chance, never the flag.
      if (!st.replies.includes('home')) next = patchStop(next, a.orderId, { pRto: sigmoid(logit(st.pRto) - HOME_LOGIT_DROP) })
      next = msgAdd(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'ack', text: wa.replyAck.home })
      return feedAdd(next, a.at, 'reply', `${label}: customer confirmed they will be home`, a.orderId)
    case 'change_time': {
      // Parked until the next day's slot (or, for an early parcel, the promised date), but still counted in its arm as an open order.
      if (st.status === 'out_for_delivery' || st.status === 'ndr') {
        const to = nextDayStart(s.simNow) + Math.max(0, early - 1) * DAY_MS
        next = moveOrder(next, a.orderId, 'rescheduled', { at: a.at, reason: early > 0 ? 'customer kept the promised date' : 'customer asked for another time', patch: { reschedules: st.reschedules + 1, rescheduledTo: to } })
        next = emit(next, a.at, 'RESCHEDULED', { toSimAt: to }, { orderId: a.orderId })
      }
      next = msgAdd(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'ack', text: early > 0 ? wa.keepDateAck(early) : wa.replyAck.change_time })
      return feedAdd(
        next,
        a.at,
        'reply',
        early > 0 ? `${label}: the parcel came ${early} days early; parked until the promised date, still counted` : `${label}: customer asked for another time (parked for the next day, still counted)`,
        a.orderId,
      )
    }
    case 'pay_now': {
      // Nothing changes until a payment is attempted: the customer pays, or the payment fails and the order stays COD.
      if (st.order.payment === 'PREPAID') return feedAdd(next, a.at, 'reply', `${label}: the order is already prepaid`, a.orderId)
      next = patchStop(next, a.orderId, { paymentPending: true })
      next = sendProactive(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'pay_prompt', text: wa.replyAck.pay_now, buttons: wa.payButtons })
      return feedAdd(next, a.at, 'reply', `${label}: waiting for the payment (the order stays COD until it goes through)`, a.orderId)
    }
    case 'fix_address': {
      if (!a.location) {
        next = msgAdd(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'ack', text: wa.replyAck.fix_address })
        return feedAdd(next, a.at, 'reply', `${label}: waiting for the customer to share a location`, a.orderId)
      }
      const km = Math.round(roadKmEstimate(s.hub, a.location) * 10) / 10
      const order: Order = { ...st.order, lat: a.location.lat, lng: a.location.lng, distanceKm: km, addressQuality: 'clear' }
      const drop = st.order.addressQuality === 'clear' ? 0 : ADDRESS_FIX_LOGIT_DROP
      next = patchStop(next, a.orderId, { order, location: { lat: coarse(a.location.lat), lng: coarse(a.location.lng) }, score: rescueScore(order), pRto: sigmoid(logit(st.pRto) - drop) })
      next = msgAdd(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'ack', text: wa.addressFixedAck })
      return feedAdd(next, a.at, 'reply', `Address pin moved: ${st.order.distanceKm.toFixed(1)} km to ${km.toFixed(1)} km from the hub, score recomputed`, a.orderId)
    }
  }
}

/** The customer picks English or Hindi for their WhatsApp messages from now on (plan 33). Any time; the same choice again changes nothing. */
function customerLanguage(s: S, a: Extract<Action, { type: 'customerLanguage' }>): S {
  const st = s.stops[a.orderId]
  if (!s.started || !st || st.lang === a.lang) return s
  let next = tap(s, a.at, a.orderId, a.lang === 'hi' ? 'हिंदी' : 'English')
  next = patchStop(next, a.orderId, { lang: a.lang })
  next = emit(next, a.at, 'LANGUAGE_CHOSEN', { lang: a.lang }, { orderId: a.orderId })
  next = msgAdd(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'ack', text: waCopy(a.lang).languageAck })
  return feedAdd(next, a.at, 'reply', `Customer chose ${a.lang === 'hi' ? 'Hindi' : 'English'} for WhatsApp`, a.orderId)
}

function customerPayment(s: S, a: Extract<Action, { type: 'customerPayment' }>): S {
  const st = s.stops[a.orderId]
  if (!st || !st.paymentPending || st.order.payment === 'PREPAID') return s
  const wa = waCopy(st.lang)
  let next = tap(s, a.at, a.orderId, a.ok ? wa.payButtons[0].label : wa.payButtons[1].label)
  next = emit(next, a.at, 'PAYMENT_ATTEMPTED', { ok: a.ok }, { orderId: a.orderId })
  if (!a.ok) {
    next = patchStop(next, a.orderId, { paymentPending: false })
    next = msgAdd(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'ack', text: wa.paymentFailAck })
    next = feedAdd(next, a.at, 'reply', 'Payment failed: the order stays COD', a.orderId)
    return afterSecondChancePayment(next, a.orderId, a.at)
  }
  const order: Order = { ...st.order, payment: 'PREPAID' }
  next = patchStop(next, a.orderId, { order, pRto: st.pRto * PAY_NOW_RTO_FACTOR, paymentPending: false })
  next = msgAdd(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'ack', text: wa.paymentOkAck })
  next = feedAdd(next, a.at, 'reply', 'Payment received: COD order switched to prepaid', a.orderId)
  return afterSecondChancePayment(next, a.orderId, a.at)
}

function requestOtp(s: S, orderId: string, code: string, at: number, purpose: 'delivery' | 'refusal', refusalReason?: Extract<Action, { type: 'riderRefuse' }>['reason']): S {
  const st = s.stops[orderId]
  if (!st || (st.status !== 'out_for_delivery' && st.status !== 'otp_sent')) return s
  let next = st.status === 'otp_sent' ? s : moveOrder(s, orderId, 'otp_sent', { at, reason: 'rider asked for the OTP' })
  // Wrong tries carry over to a re-requested code, so asking for a fresh OTP never resets the guess counter.
  next = {
    ...next,
    otps: {
      ...next.otps,
      [orderId]: {
        orderId,
        code,
        purpose,
        issuedAt: at,
        issuedSim: s.simNow,
        attempts: s.otps[orderId]?.attempts ?? 0,
        // A new code does not dodge a cooldown that is running.
        ...(s.otps[orderId]?.lockedUntil === undefined ? {} : { lockedUntil: s.otps[orderId].lockedUntil }),
        ...(refusalReason ? { refusalReason } : {}),
      },
    },
  }
  next = emit(next, at, 'OTP_REQUESTED', { purpose }, { orderId })
  next = msgAdd(next, {
    orderId,
    at,
    direction: 'out',
    kind: purpose === 'delivery' ? 'delivery_otp' : 'refusal_otp',
    text: purpose === 'delivery' ? waCopy(st.lang).deliveryOtpText(code) : waCopy(st.lang).refusalOtpText(code),
  })
  return feedAdd(next, at, purpose === 'delivery' ? 'deliver' : 'refuse', purpose === 'delivery' ? 'Rider tapped Deliver: OTP sent to the customer' : 'Rider tapped Refused: refusal OTP sent to the customer', orderId)
}

function completeDelivery(s: S, orderId: string, at: number): S {
  const st = s.stops[orderId]
  const attempt = st.failedAttempts + 1
  let next = moveOrder(s, orderId, deliveredStatus(attempt), { at, reason: 'delivery OTP verified', patch: { deliveredAt: at, deliveredSim: s.simNow } })
  if (!isDelivered(next.stops[orderId].status)) return next
  next = emit(next, at, 'DELIVERED', { attempt }, { orderId, riderId: st.riderId })
  const second = attempt > 1 ? ' on the second attempt' : ''
  next = feedAdd(next, at, 'deliver', `Delivered by ${riderName(s, st.riderId)}${second} (OTP verified)${st.flagged ? ' · Bonus-Eligible' : ''}`, orderId)
  next = accrueBonus(next, orderId, at)
  next = secondChanceDelivered(next, orderId, at)
  if (st.rehomedFrom !== undefined) next = rehomeDelivered(next, orderId, at)
  return next
}

function completeRefusal(s: S, orderId: string, at: number, reason: Parameters<typeof buildParcel>[3]): S {
  const st = s.stops[orderId]
  let next = moveOrder(s, orderId, 'refused', { at, reason: 'refusal OTP verified', patch: { failedAttempts: st.failedAttempts + 1 } })
  if (next.stops[orderId].status !== 'refused') return next
  next = emit(next, at, 'REFUSED', { reason: reason ?? 'unspecified' }, { orderId })
  // A re-homed parcel refused by its new buyer is not a new parcel for the Desk: the original goes back in a batched return.
  if (st.rehomedFrom !== undefined) return closeAsRto(next, orderId, at, 'the new buyer refused the re-homed parcel')
  // A customer who took the second chance and refuses again on attempt 2 is not a new parcel for the Desk: the order goes back, and no saving books.
  if (s.parcels.some((p) => p.orderId === orderId)) return closeAsRto(next, orderId, at, 'refused again after the second chance')
  // The first four refusals of demo stops show every Router outcome, in order (see SHOWCASE in parcels.ts).
  const isDemo = (id: string): boolean => s.stops[id]?.manual === true && s.stops[id].rehomedFrom === undefined
  const showcaseIndex = isDemo(orderId) ? s.parcels.filter((p) => isDemo(p.orderId)).length : -1
  const parcel = buildParcel(st, s.hub, showcaseIndex >= 0 && showcaseIndex < SHOWCASE.length ? showcaseIndex : undefined, reason)
  next = {
    ...next,
    parcels: [...next.parcels, { id: parcel.id, orderId, parcel, state: 'queued', secondChanceDeclined: false, secondChanceExpired: false, sellerClaim: parcel.reason === 'damaged', at }],
  }
  next = feedAdd(next, at, 'refuse', 'Refusal confirmed by OTP: parcel sent to the Refused-Parcel Desk', orderId)
  // A simulated rider's parcel is inspected at once; the live demo stop waits for the hub operator.
  return st.manual ? next : autoInspect(next, parcel.id, at)
}

function submitOtp(s: S, a: Extract<Action, { type: 'submitOtp' }>): S {
  const otp = s.otps[a.orderId]
  if (!otp || s.stops[a.orderId]?.status !== 'otp_sent') return s
  if (a.at - otp.issuedAt > OTP_TTL_MS || s.simNow - otp.issuedSim >= OTP_SIM_TTL_MS) {
    return feedAdd(emit(s, a.at, 'OTP_FAILED', { reason: 'expired' }, { orderId: a.orderId }), a.at, 'info', 'OTP expired after 10 minutes: tap the button again to send a new one', a.orderId)
  }
  if (otp.lockedUntil !== undefined && a.at < otp.lockedUntil) {
    return feedAdd(s, a.at, 'info', `OTP locked after ${MAX_OTP_ATTEMPTS} wrong tries: try again in ${Math.ceil((otp.lockedUntil - a.at) / 60_000)} min`, a.orderId)
  }
  // The cooldown is over: five fresh tries.
  const fresh = otp.lockedUntil === undefined ? otp : { ...otp, attempts: 0, lockedUntil: undefined }
  if (a.code !== otp.code) {
    const attempts = fresh.attempts + 1
    const locked = attempts >= MAX_OTP_ATTEMPTS ? { lockedUntil: a.at + OTP_COOLDOWN_MS } : {}
    const { lockedUntil: _gone, ...base } = fresh
    void _gone
    const next = emit({ ...s, otps: { ...s.otps, [a.orderId]: { ...base, attempts, ...locked } } }, a.at, 'OTP_FAILED', { reason: 'wrong code' }, { orderId: a.orderId })
    return feedAdd(next, a.at, 'info', `Wrong OTP (${attempts}/${MAX_OTP_ATTEMPTS})`, a.orderId)
  }
  const rest = Object.fromEntries(Object.entries(s.otps).filter(([id]) => id !== a.orderId))
  const cleared = emit({ ...s, otps: rest }, a.at, 'OTP_VERIFIED', { purpose: otp.purpose }, { orderId: a.orderId })
  return otp.purpose === 'delivery' ? completeDelivery(cleared, a.orderId, a.at) : completeRefusal(cleared, a.orderId, a.at, otp.refusalReason)
}

function riderAttempt(s: S, a: Extract<Action, { type: 'riderAttempt' }>): S {
  const st = s.stops[a.orderId]
  if (!st || (st.status !== 'out_for_delivery' && st.status !== 'otp_sent')) return s
  // The call count is the app's own log since the order went out, never a number the rider typed.
  const evidence: AttemptEvidence | undefined = a.evidence ? { gpsDistM: a.evidence.gpsDistM, calls: callsSinceDispatch(s, a.orderId).length, waitMin: a.evidence.waitMin } : undefined
  const confidence = attemptConfidence(evidence, false)
  let next = moveOrder(s, a.orderId, 'ndr', {
    at: a.at,
    reason: 'attempt logged',
    patch: {
      failedAttempts: st.failedAttempts + 1,
      claim: a.claim,
      answers: { riderReached: null, askedReschedule: null },
      assessment: undefined,
      evidence,
      confidence,
      attemptRiderId: st.riderId,
      failedSim: s.simNow,
      // Every failed attempt stays on the order, so a later attempt never erases what an earlier one looked like.
      attemptLog: [...(st.attemptLog ?? []), { riderId: st.riderId, simAt: s.simNow, confidence, ...(evidence ? { evidence } : {}), reached: null }],
    },
  })
  next = emit(
    next,
    a.at,
    'ATTEMPT_LOGGED',
    { reason: a.claim, gpsDistM: evidence?.gpsDistM ?? null, calls: evidence?.calls ?? null, waitMin: evidence?.waitMin ?? null, confidence },
    { orderId: a.orderId, riderId: st.riderId },
  )
  next = sendProactive(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'attempt_check', text: waCopy(st.lang).attemptCheckText(st.order.awb), buttons: waCopy(st.lang).reachButtons })
  next = feedAdd(next, a.at, 'attempt', `${riderName(s, st.riderId)} marked an attempt (${a.claim.replace('_', ' ')}): asking the customer to confirm`, a.orderId)
  return openException(next, a.orderId, a.at, confidence)
}

function assess(s: S, orderId: string, at: number): S {
  const st = s.stops[orderId]
  if (!st.claim) return s
  const assessment = assessAttempt(st.claim, st.answers)
  let next = patchStop(s, orderId, { assessment })
  const confidence = confidenceOf(next.stops[orderId])
  next = patchStop(next, orderId, { confidence })
  if (assessment.status === 'suspect') {
    const who = st.attemptRiderId ?? st.riderId
    const known = next.stops[orderId].suspectRiderIds ?? []
    if (!known.includes(who)) next = patchStop(next, orderId, { suspectRiderIds: [...known, who] })
    next = feedAdd(next, at, 'suspect', `Suspect attempt by ${riderName(s, st.attemptRiderId ?? st.riderId)}: ${assessment.reason}. Bonus on this order is blocked`, orderId)
    return openException(next, orderId, at, confidence)
  }
  if (assessment.status === 'verified') return feedAdd(next, at, 'attempt', `Attempt verified: ${assessment.reason}`, orderId)
  return next
}

function customerReach(s: S, a: Extract<Action, { type: 'customerReach' }>): S {
  const st = s.stops[a.orderId]
  if (!st || st.status !== 'ndr' || st.answers.riderReached !== null) return s
  const wa = waCopy(st.lang)
  let next = tap(s, a.at, a.orderId, a.reached ? wa.reachButtons[0].label : wa.reachButtons[1].label)
  const log = (st.attemptLog ?? []).map((e, i, all) => (i === all.length - 1 ? { ...e, reached: a.reached } : e))
  next = patchStop(next, a.orderId, { answers: { ...st.answers, riderReached: a.reached }, attemptLog: log })
  next = emit(next, a.at, 'ATTEMPT_CHECK_ANSWERED', { reached: a.reached }, { orderId: a.orderId })
  if (a.reached && st.claim === 'reschedule_requested') {
    return sendProactive(next, { orderId: a.orderId, at: a.at, direction: 'out', kind: 'reschedule_check', text: wa.rescheduleCheckText, buttons: wa.yesNo })
  }
  return assess(next, a.orderId, a.at)
}

function customerAskedReschedule(s: S, a: Extract<Action, { type: 'customerAskedReschedule' }>): S {
  const st = s.stops[a.orderId]
  if (!st || st.status !== 'ndr' || st.answers.askedReschedule !== null) return s
  const wa = waCopy(st.lang)
  let next = tap(s, a.at, a.orderId, a.asked ? wa.yesNo[0].label : wa.yesNo[1].label)
  next = patchStop(next, a.orderId, { answers: { ...st.answers, askedReschedule: a.asked } })
  return assess(next, a.orderId, a.at)
}

function reattempt(s: S, a: Extract<Action, { type: 'reattempt' }>): S {
  const { state, outcome } = retryOne(s, a.orderId, a.at, a.riderId)
  if (outcome === 'refused') return s
  const st = s.stops[a.orderId]
  const holder = state.stops[a.orderId].riderId
  let next = outcome === 'retried' ? overtakeException(state, a.orderId, a.at) : state
  next = feedAdd(
    next,
    a.at,
    'attempt',
    outcome === 'retried'
      ? `Attempt ${st.failedAttempts + 1} for ${st.order.awb} goes to ${riderName(s, holder)}${holder === st.riderId ? '' : ' (another rider of the same arm)'}`
      : `${st.order.awb}: another attempt is not possible or not worth it: goes back as an RTO`,
    a.orderId,
  )
  return next
}

function dispatchNextDay(s: S, a: Extract<Action, { type: 'dispatchNextDay' }>): S {
  const st = s.stops[a.orderId]
  if (!st || st.status !== 'rescheduled') return s
  let next = moveOrder(s, a.orderId, 'out_for_delivery', { at: a.at, reason: 'rescheduled time arrived' })
  // A second chance with a different time spends its ₹21 leg when the order goes back out, by the clock or by this override.
  if (st.viaSecondChance && next.stops[a.orderId].status === 'out_for_delivery') next = bookSecondChanceLeg(next, a.orderId, a.at)
  return feedAdd(next, a.at, 'attempt', `${st.order.awb}: the rescheduled time has come, back in ${riderName(s, st.riderId)}'s bag as attempt ${st.failedAttempts + 1}`, a.orderId)
}

function openReturn(s: S, a: Extract<Action, { type: 'openReturn' }>): S {
  const st = s.stops[a.orderId]
  if (!st || !isDelivered(st.status) || st.returned) return s
  let next = patchStop(s, a.orderId, { returned: true })
  next = emit(next, a.at, 'RETURN_OPENED', {}, { orderId: a.orderId })
  next = feedAdd(next, a.at, 'info', `Customer opened a return on ${st.order.awb}`, a.orderId)
  return clawBack(next, a.orderId, a.at)
}

/** Move the sim clock and fire what is due. */
function advance(s: S, at: number, minutes: number): S {
  if (!s.started || !(minutes > 0) || !Number.isFinite(minutes)) return s
  const to = s.simNow + minutes * MINUTE_MS
  const moved = emit({ ...s, simNow: to }, at, 'CLOCK_ADVANCED', { from: s.simNow, to })
  return tick(moved, at).state
}

const untilNextDay = (s: S): number => (nextDayStart(s.simNow) - s.simNow) / MINUTE_MS

function apply(s: S, a: Action): S {
  switch (a.type) {
    case 'startDay':
      return startDay(s, a.at)
    case 'customerReply':
      return customerReply(s, a)
    case 'customerPayment':
      return customerPayment(s, a)
    case 'customerLanguage':
      return customerLanguage(s, a)
    case 'riderDeliver':
      return requestOtp(s, a.orderId, a.code, a.at, 'delivery')
    case 'riderRefuse':
      return requestOtp(s, a.orderId, a.code, a.at, 'refusal', a.reason)
    case 'submitOtp':
      return submitOtp(s, a)
    case 'riderAttempt':
      return riderAttempt(s, a)
    case 'riderCall':
      return riderCall(s, a)
    case 'customerReach':
      return customerReach(s, a)
    case 'customerAskedReschedule':
      return customerAskedReschedule(s, a)
    case 'deskSecondChance':
      return deskSecondChance(s, a)
    case 'deskInspect':
      return deskInspect(s, a)
    case 'deskSkipSecondChance':
      return deskSkipSecondChance(s, a)
    case 'deskHandover':
      return deskHandover(s, a)
    case 'customerSecondChance':
      return customerSecondChance(s, a)
    case 'deskSetParam':
      return deskSetParam(s, a)
    case 'deskHold':
      return deskHold(s, a)
    case 'deskMatch':
      return deskMatch(s, a)
    case 'deskConsolidate':
      return deskConsolidate(s, a)
    case 'reattempt':
      return reattempt(s, a)
    case 'dispatchNextDay':
      return dispatchNextDay(s, a)
    case 'resolveException':
      return resolveExceptionFor(s, a.orderId, a.action, a.at, false, { reason: a.reason, note: a.note })
    case 'overturnStrike':
      return overturnStrike(s, a)
    case 'riderAskReview':
      return askReview(s, a)
    case 'reviewBonus':
      return reviewBonus(s, a)
    case 'openReturn':
      return openReturn(s, a)
    case 'reconcileCod':
      return s.started ? reconcileCod(s, a.at, true) : s
    case 'advanceClock':
      return advance(s, a.at, a.minutes)
    case 'advanceDay':
    case 'nextDay':
      return advance(s, a.at, untilNextDay(s))
    case 'closePilot':
      return s.started ? closePilot(s, a.at, reduce) : s
    default:
      // A type this build does not know (an old client, a crafted action): the state is left untouched.
      return s
  }
}

/** Pure: the same state and action always give the same next state. Unknown or invalid actions return the state unchanged. */
export function reduce(state: DayState, action: Action): DayState {
  const next = apply(state, action)
  return next === state ? state : { ...next, version: state.version + 1 }
}

