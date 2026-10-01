import { attemptConfidence, type AttemptConfidence } from '../engine/attempts.ts'
import { emit } from './events.ts'
import { bookCost, feedAdd, moveOrder, patchStop, REATTEMPT_LEG_COST, riderName, type S } from './helpers.ts'
import { reattemptDecision } from './lifecycle.ts'
import { failRehome } from './routing.ts'
import { captainName, enhancedReview, hasNote, recordStrike, STRIKE_REASONS, strikeSupport } from './captain.ts'
import type { ExceptionAction, ExceptionItem, StopRecord, StrikeReason } from './types.ts'

/** Cost of a person reviewing a disputed attempt (assumption, Valmo, bonus stream) */
export const EXCEPTION_REVIEW_COST = 10
/** An exception nobody resolves in this long becomes a free re-attempt on its own */
export const EXCEPTION_DEFAULT_MS = 24 * 60 * 60 * 1000

const bagEnd = (s: S, riderId: string): number => Math.max(0, ...s.stopOrder.filter((id) => s.stops[id].riderId === riderId).map((id) => s.stops[id].seq)) + 1

/**
 * Close an order as an RTO. A re-homed order that ends this way fails its parcel back into a batched return, with no saving booked.
 */
export function closeAsRto(s: S, orderId: string, at: number, reason: string): S {
  const st = s.stops[orderId]
  let next = moveOrder(s, orderId, 'rto', { at, reason })
  if (next.stops[orderId].status !== 'rto') return next
  if (st.rehomedFrom !== undefined) next = failRehome(next, orderId, at)
  return next
}

/**
 * Retry or close one failed (not-home) order. A retry needs an attempt to be left and `P(success) x ₹120 - ₹21 > 0`.
 * Returns the state and what happened. `riderId` hands the retry to another rider, which must be in the same arm.
 */
export function retryOne(s: S, orderId: string, at: number, riderId?: string): { readonly state: S; readonly outcome: 'retried' | 'closed' | 'refused' } {
  const st = s.stops[orderId]
  const target = riderId === undefined ? undefined : s.riders.find((r) => r.id === riderId)
  if (!st || st.status !== 'ndr' || (riderId !== undefined && (!target || (st.arm !== undefined && target.arm !== st.arm)))) return { state: s, outcome: 'refused' }
  const decision = reattemptDecision({ attempt: st.failedAttempts, maxAttempts: s.config.maxAttempts, pSuccessNext: 1 - st.pRto })
  if (!decision.reattempt) return { state: closeAsRto(s, orderId, at, decision.reason), outcome: 'closed' }
  const patch: Partial<StopRecord> = target && target.id !== st.riderId ? { riderId: target.id, seq: bagEnd(s, target.id) } : {}
  let next = moveOrder(s, orderId, 'out_for_delivery', { at, reason: decision.reason, patch })
  next = bookCost(next, at, 'Re-attempt (last-mile leg)', REATTEMPT_LEG_COST, 'Valmo', 'common', orderId)
  return { state: next, outcome: 'retried' }
}

/** A failed attempt was handled by hand (a re-attempt was set up directly): close its open dispute without deciding it. */
export function overtakeException(s: S, orderId: string, at: number): S {
  const item = openExceptionFor(s, orderId)
  if (!item) return s
  const next: S = { ...s, exceptions: s.exceptions.map((e) => (e.id === item.id ? { ...e, status: 'resolved', action: 'confirm', auto: false, overtaken: true, resolvedSim: s.simNow } : e)) }
  return emit(next, at, 'EXCEPTION_RESOLVED', { action: 'confirm', auto: false, overtaken: true }, { orderId, riderId: item.riderId })
}

export const openExceptionFor = (s: S, orderId: string): ExceptionItem | undefined => s.exceptions.find((e) => e.orderId === orderId && e.status === 'open')

/** Ops hears about a weak or disputed attempt. One exception per attempt: a resolved one is never reopened for the same attempt. */
export function openException(s: S, orderId: string, at: number, confidence: AttemptConfidence): S {
  const st = s.stops[orderId]
  if (!st || st.status !== 'ndr') return s
  // A weak or disputed attempt always goes to the hub captain. A rider on the enhanced-review step of the ladder (2 active strikes) has EVERY failed attempt reviewed.
  const enhanced = enhancedReview(s, st.attemptRiderId ?? st.riderId)
  if (confidence !== 'low' && !enhanced) return s
  if (s.exceptions.some((e) => e.orderId === orderId && (e.status === 'open' || e.openedSim >= (st.failedSim ?? 0)))) return s
  const item: ExceptionItem = {
    id: `x${s.nextId}`,
    orderId,
    riderId: st.attemptRiderId ?? st.riderId,
    openedSim: s.simNow,
    confidence,
    status: 'open',
    owner: 'hub_captain',
    ...(enhanced && confidence !== 'low' ? { enhanced: true } : {}),
  }
  let next: S = { ...s, exceptions: [...s.exceptions, item], nextId: s.nextId + 1 }
  next = emit(next, at, 'EXCEPTION_OPENED', { confidence, ...(item.enhanced ? { enhanced: true } : {}) }, { orderId, riderId: item.riderId })
  const why = item.enhanced ? `${riderName(s, item.riderId)} is on the enhanced-review step, so every failed attempt is reviewed` : 'the attempt looks weak or disputed'
  return feedAdd(next, at, 'suspect', `Exception opened for ${st.order.awb}: ${why}. ${captainName(s.hub)} has 24 h to decide`, orderId)
}

/** The same-arm rider (not the one who made the attempt) with the lightest bag */
function otherRider(s: S, orderId: string): string {
  const st = s.stops[orderId]
  const load = (id: string): number => s.stopOrder.filter((sid) => s.stops[sid].riderId === id && !['delivered_a1', 'delivered_a2', 'rto', 'rehomed', 'hub_pickup', 'cancelled'].includes(s.stops[sid].status)).length
  const pool = s.riders.filter((r) => r.arm === st.arm && r.id !== (st.attemptRiderId ?? st.riderId)).sort((a, b) => load(a.id) - load(b.id) || (a.id < b.id ? -1 : 1))
  return pool[0]?.id ?? st.riderId
}

interface Detail {
  readonly reason?: StrikeReason
  readonly note?: string
}

function markResolved(s: S, orderId: string, action: ExceptionAction, at: number, auto: boolean, detail: Detail): S {
  const item = openExceptionFor(s, orderId)!
  const next: S = {
    ...s,
    exceptions: s.exceptions.map((e) =>
      e.id === item.id
        ? {
            ...e,
            status: 'resolved',
            action,
            auto,
            resolvedSim: s.simNow,
            // Silence is not a decision: after 24 h it is a free re-attempt marked "the captain did not decide".
            ...(auto ? { captainMissed: true } : { captainName: captainName(s.hub) }),
            ...(detail.reason === undefined ? {} : { reason: detail.reason }),
            ...(hasNote(detail.note) ? { note: (detail.note ?? '').trim().slice(0, 140) } : {}),
          }
        : e,
    ),
  }
  const logged = emit(next, at, 'EXCEPTION_RESOLVED', { action, auto, ...(auto ? { captainMissed: true } : {}) }, { orderId, riderId: item.riderId })
  return auto ? logged : bookCost(logged, at, 'Exception review labour', EXCEPTION_REVIEW_COST, 'Valmo', 'bonus', orderId)
}

/**
 * Ops (or the 24 h default) decides an open exception.
 *  confirm: the attempt was valid, the normal failed-attempt path continues and the bonus block is lifted.
 *  free_reattempt: another rider of the same arm tries again; the failed attempt does not count against the cap; the first rider is not paid.
 *  strike: the same, plus a confirmed fake attempt on the first rider's record.
 */
export function resolveExceptionFor(s: S, orderId: string, action: ExceptionAction, at: number, auto = false, detail: Detail = {}): S {
  const st = s.stops[orderId]
  const item = openExceptionFor(s, orderId)
  if (!st || !item || st.status !== 'ndr') return s
  if (action === 'strike') {
    // A strike needs a reason chip and corroboration: the customer's word alone is not enough. The 24 h default is never a strike.
    if (auto || detail.reason === undefined || !STRIKE_REASONS.includes(detail.reason)) return s
    if (!strikeSupport(s, item).ok && !hasNote(detail.note)) return s
  }
  let next = markResolved(s, orderId, action, at, auto, detail)
  const faker = st.attemptRiderId ?? st.riderId
  if (action === 'confirm') {
    const assessment = st.assessment ? { ...st.assessment, status: 'verified' as const, reason: 'The hub captain confirmed the attempt was valid', bonusBlocked: false } : undefined
    const cleared = (st.suspectRiderIds ?? []).filter((id) => id !== faker)
    const log = (st.attemptLog ?? []).map((a, i, all) => (i === all.length - 1 && a.riderId === faker ? { ...a, cleared: true } : a))
    next = patchStop(next, orderId, { assessment, confidence: 'medium', suspectRiderIds: cleared, attemptLog: log })
    return feedAdd(next, at, 'attempt', `${captainName(s.hub)} confirmed the attempt on ${st.order.awb} was valid`, orderId)
  }
  if (action === 'strike') next = recordStrike(next, at, st, faker, detail.reason as StrikeReason, detail.note)
  const target = otherRider(next, orderId)
  next = moveOrder(next, orderId, 'out_for_delivery', {
    at,
    reason: 'free re-attempt after an exception',
    patch: { riderId: target, seq: bagEnd(next, target), failedAttempts: Math.max(0, st.failedAttempts - 1) },
  })
  return feedAdd(next, at, 'attempt', `Free re-attempt for ${st.order.awb}: ${riderName(s, target)} (same arm) takes it${auto ? ' after 24 h with no decision' : ''}; it does not count against the attempt cap`, orderId)
}

/** Confidence of a failed attempt, given the evidence and whether the customer contradicts it */
export const confidenceOf = (st: StopRecord): AttemptConfidence => attemptConfidence(st.evidence, st.assessment?.status === 'suspect')
