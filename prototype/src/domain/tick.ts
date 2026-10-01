import { logit, sigmoid } from '../engine/math.ts'
import { HOUR_MS, MINUTE_MS, codReconciliationTime, dayIndex } from './clock.ts'
import { emit } from './events.ts'
import { bookSecondChanceLeg, feedAdd, moveOrder, patchStop, type S } from './helpers.ts'
import { reconcileCod, releaseDue } from './ledger.ts'
import { closeAsRto, EXCEPTION_DEFAULT_MS, openExceptionFor, resolveExceptionFor, retryOne } from './orders.ts'
import { parcelTimers } from './routing.ts'

/** An OTP dies 10 sim-minutes after it was issued */
export const OTP_SIM_TTL_MS = 10 * MINUTE_MS
/** A flagged customer who has not replied to the order-day message 2 sim-hours later gets a small nudge in their RTO odds */
export const NO_REPLY_MS = 2 * HOUR_MS
/** Logit added to the RTO chance when the customer stays silent (assumption; the pilot measures it) */
export const NO_REPLY_LOGIT = 0.2
/** More reschedule requests than this and the order goes back as an RTO */
export const RESCHEDULE_CAP = 2

export interface TickSummary {
  readonly state: S
  /** Rescheduled orders that went back in a bag */
  readonly back: number
  /** Failed attempts retried */
  readonly retried: number
  /** Failed attempts closed as an RTO */
  readonly closed: number
}

/**
 * Fire every timer that is due at `state.simNow`: OTP expiry, no-reply, reschedules coming back, the 24 h exception default,
 * failed attempts decided at the start of a new day, the Router's 24 h and 48 h timers, cash reconciliation and bonus release.
 * Running it twice at the same time changes nothing.
 */
export function tick(s: S, at: number): TickSummary {
  let next = s
  let back = 0
  let retried = 0
  let closed = 0

  for (const otp of Object.values(s.otps)) {
    if (next.simNow - otp.issuedSim < OTP_SIM_TTL_MS) continue
    next = { ...next, otps: Object.fromEntries(Object.entries(next.otps).filter(([id]) => id !== otp.orderId)) }
    next = emit(next, at, 'OTP_FAILED', { reason: 'expired' }, { orderId: otp.orderId })
    if (next.stops[otp.orderId]?.status === 'otp_sent') next = moveOrder(next, otp.orderId, 'out_for_delivery', { at, reason: 'OTP expired' })
  }

  for (const id of s.stopOrder) {
    const st = next.stops[id]
    if (!st.flagged || st.status !== 'out_for_delivery' || st.replies.length > 0 || st.noReplyApplied || st.failedAttempts > 0) continue
    const sent = next.messages.find((m) => m.orderId === id && m.kind === 'order_day')
    if (!sent || sent.simAt === undefined || next.simNow - sent.simAt < NO_REPLY_MS) continue
    next = patchStop(next, id, { pRto: sigmoid(logit(st.pRto) + NO_REPLY_LOGIT), noReplyApplied: true })
    next = emit(next, at, 'NO_REPLY_TIMEOUT', {}, { orderId: id })
  }

  for (const id of s.stopOrder) {
    const st = next.stops[id]
    if (st.status !== 'rescheduled') continue
    if (st.reschedules > RESCHEDULE_CAP) {
      next = closeAsRto(next, id, at, 'reschedule cap exceeded')
      closed++
    } else if (st.rescheduledTo !== undefined && st.rescheduledTo <= next.simNow) {
      next = moveOrder(next, id, 'out_for_delivery', { at, reason: 'the rescheduled time arrived' })
      // A second chance with a different time spends its ₹21 leg when the order goes back out.
      if (st.viaSecondChance && next.stops[id].status === 'out_for_delivery') next = bookSecondChanceLeg(next, id, at)
      back++
    }
  }

  for (const item of s.exceptions.filter((e) => e.status === 'open')) {
    if (next.simNow - item.openedSim < EXCEPTION_DEFAULT_MS) continue
    const st = next.stops[item.orderId]
    if (st?.status === 'ndr') {
      next = resolveExceptionFor(next, item.orderId, 'free_reattempt', at, true)
    } else if (openExceptionFor(next, item.orderId)) {
      // The order moved on by itself (a re-attempt was scheduled by hand): the dispute is overtaken, not decided.
      next = { ...next, exceptions: next.exceptions.map((e) => (e.id === item.id ? { ...e, status: 'resolved', action: 'confirm', auto: true, overtaken: true, resolvedSim: next.simNow } : e)) }
      next = emit(next, at, 'EXCEPTION_RESOLVED', { action: 'confirm', auto: true, overtaken: true }, { orderId: item.orderId, riderId: item.riderId })
    }
  }

  for (const id of s.stopOrder) {
    const st = next.stops[id]
    if (st.status !== 'ndr' || st.failedSim === undefined || dayIndex(st.failedSim) >= dayIndex(next.simNow) || openExceptionFor(next, id)) continue
    const r = retryOne(next, id, at)
    next = r.state
    if (r.outcome === 'retried') retried++
    else if (r.outcome === 'closed') closed++
  }

  next = parcelTimers(next, at)
  next = reconcileCod(next, at)
  next = releaseDue(next, at)

  if (back + retried + closed > 0) {
    next = feedAdd(next, at, 'info', `Next day: ${back} rescheduled orders back in bags, ${retried} failed attempts retried, ${closed} closed as RTO`)
  }
  return { state: next, back, retried, closed }
}

/** Timers that should already have fired at `state.simNow` but have not. Empty after a tick; the Audit checks it. */
export function overdueTimers(s: S): readonly string[] {
  const out: string[] = []
  for (const otp of Object.values(s.otps)) if (s.simNow - otp.issuedSim >= OTP_SIM_TTL_MS) out.push(`OTP for ${otp.orderId} expired`)
  for (const e of s.exceptions) if (e.status === 'open' && s.simNow - e.openedSim >= EXCEPTION_DEFAULT_MS) out.push(`exception on ${e.orderId} unresolved for 24 h`)
  for (const p of s.parcels) {
    if (p.state === 'second_chance_sent' && p.secondChanceSentSim !== undefined && s.simNow - p.secondChanceSentSim >= s.router.secondChanceHours * HOUR_MS) out.push(`second chance for ${p.parcel.awb} unanswered for 24 h`)
    if (p.state === 'pickup_reserved' && p.pickup !== undefined && s.simNow >= p.pickup.deadline) out.push(`pickup of ${p.parcel.awb} is past its window`)
    if (p.state === 'held' && p.heldSim !== undefined && (s.simNow - p.heldSim >= s.router.holdHours * HOUR_MS || (p.matchAt !== undefined && p.matchAt <= s.simNow))) out.push(`hold on ${p.parcel.awb} is past its window`)
  }
  for (const id of s.stopOrder) {
    const st = s.stops[id]
    if (st.status === 'rescheduled' && st.rescheduledTo !== undefined && st.rescheduledTo <= s.simNow) out.push(`reschedule of ${id} is due`)
    if (st.status === 'ndr' && st.failedSim !== undefined && dayIndex(st.failedSim) < dayIndex(s.simNow) && !openExceptionFor(s, id)) out.push(`failed attempt on ${id} was not decided at day start`)
  }
  for (const l of s.ledger) {
    if (l.status === 'pending' && s.simNow >= l.deliveredSim + 7 * 24 * HOUR_MS) out.push(`bonus for ${l.orderId} should have been released`)
    if (l.status === 'accrued' && s.simNow >= codReconciliationTime(l.deliveredSim)) out.push(`COD cash for ${l.orderId} should have been reconciled`)
  }
  return out
}
