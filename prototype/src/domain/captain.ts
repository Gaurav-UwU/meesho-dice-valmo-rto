import { EVIDENCE_RULE } from '../engine/attempts.ts'
import type { Hub } from '../engine/types.ts'
import { DAY_MS, HOUR_MS } from './clock.ts'
import { emit } from './events.ts'
import { bookCost, feedAdd, riderName, type S } from './helpers.ts'
import type { BonusReview, ExceptionItem, StopRecord, StrikeReason, StrikeRecord } from './types.ts'

/**
 * Fake-attempt control with the hub captain (plan 24). Nothing here reads the bonus: strikes, the ladder and the review queue work with
 * the bonus off and for riders in both arms. The bonus only adds two extra consequences (blocked at 2 strikes, and the parking-gap hold).
 */

/** A strike counts for 30 days (rolling) unless Ops overturns it */
export const STRIKE_ACTIVE_MS = 30 * DAY_MS
/** Ops can overturn a strike for 48 h after it was issued */
export const OVERTURN_WINDOW_MS = 48 * HOUR_MS
/** At 2 active strikes every failed attempt of the rider goes to the captain for 14 days */
export const ENHANCED_REVIEW_MS = 14 * DAY_MS
/** Cost of a person reviewing one thing (assumption, Valmo) */
export const REVIEW_COST = 10
/** The captain reads a held bonus inside the 7-day return window */
export const BONUS_HOLD_WINDOW_MS = 7 * DAY_MS
/** A strike needs more than the customer's word: this many OTHER disputed attempts by the rider in the last 7 days count as "a repeated pattern" */
export const PATTERN_MIN_OTHERS = 2
export const PATTERN_WINDOW_MS = 7 * DAY_MS
/** A written captain note this long counts as corroboration on its own */
export const NOTE_MIN_CHARS = 5

export const STRIKE_REASONS: readonly StrikeReason[] = ['phone_far', 'customer_says_nobody_came', 'repeated_pattern', 'other']

export const STRIKE_REASON_LABEL: Readonly<Record<StrikeReason, string>> = {
  phone_far: 'Phone far from the address',
  customer_says_nobody_came: 'Customer says nobody came',
  repeated_pattern: 'Repeated pattern',
  other: 'Other',
}

/** Synthetic captains: one per hub, named for the demo. A real rollout needs a captain login. */
const CAPTAINS: Readonly<Record<string, string>> = {
  powai: 'Captain Ramesh',
  whitefield: 'Captain Kiran',
  lucknow: 'Captain Irfan',
  gaya: 'Captain Sunil',
}

export const captainName = (hub: Hub): string => CAPTAINS[hub.id] ?? 'Hub captain'
export const captainTitle = (hub: Hub): string => `${captainName(hub)}, ${hub.name.split('·').pop()?.trim() ?? hub.name}`

export type LadderStep = 'clear' | 'warning' | 'enhanced' | 'escalated'

/** 0 strikes: clear. 1: warning and coaching. 2: every failed attempt reviewed for 14 days (and any bonus blocked). 3 or more: the hub manager decides. */
export const ladderStep = (activeCount: number): LadderStep => (activeCount >= 3 ? 'escalated' : activeCount === 2 ? 'enhanced' : activeCount === 1 ? 'warning' : 'clear')

/** A rider's strikes that count right now (or at an earlier moment): inside 30 days and not overturned. */
export function activeStrikes(s: S, riderId: string, at: number = s.simNow): readonly StrikeRecord[] {
  return s.strikeLog.filter((k) => k.riderId === riderId && k.simAt <= at && at - k.simAt < STRIKE_ACTIVE_MS && (k.overturnedSim === undefined || k.overturnedSim > at))
}

export const activeCount = (s: S, riderId: string, at: number = s.simNow): number => activeStrikes(s, riderId, at).length

/** True while the rider is on the enhanced-review step: 2 or more active strikes, and the latest one is under 14 days old. */
export function enhancedReview(s: S, riderId: string): boolean {
  const live = activeStrikes(s, riderId)
  if (live.length < 2) return false
  const latest = Math.max(...live.map((k) => k.simAt))
  return s.simNow - latest < ENHANCED_REVIEW_MS
}

export interface Corroboration {
  readonly ok: boolean
  /** The signals that support the dispute, in words. Empty means only the customer's word. */
  readonly signals: readonly string[]
}

/**
 * A strike needs corroboration: the customer's "the rider never came" alone is not enough. Supporting evidence is the phone more than 500 m from the
 * address, no calls, no waiting time, or a repeated pattern (other disputed attempts by the same rider in 7 days). A written captain note also counts.
 */
export function strikeSupport(s: S, item: ExceptionItem): Corroboration {
  const ev = s.stops[item.orderId]?.evidence
  const signals: string[] = []
  if (ev) {
    if (ev.gpsDistM > EVIDENCE_RULE.fakeMinM) signals.push(`the phone was ${Math.round(ev.gpsDistM)} m from the address`)
    if (ev.calls === 0) signals.push('no calls were logged')
    if (ev.waitMin === 0) signals.push('no waiting time was logged')
  }
  // Distinct OTHER orders disputed in the last 7 days, leaving out disputes the captain already confirmed valid: those are not a pattern.
  const cleared = new Set(s.exceptions.filter((e) => e.action === 'confirm' && e.status === 'resolved' && e.overtaken !== true && e.auto !== true).map((e) => e.orderId))
  const others = new Set(
    s.events
      .filter((e) => e.type === 'EXCEPTION_OPENED' && e.data.enhanced !== true && e.riderId === item.riderId && e.orderId !== item.orderId && e.orderId !== undefined && !cleared.has(e.orderId) && s.simNow - e.simAt < PATTERN_WINDOW_MS)
      .map((e) => e.orderId),
  ).size
  if (others >= PATTERN_MIN_OTHERS) signals.push(`a repeated pattern: ${others} other disputed attempts in 7 days`)
  return { ok: signals.length > 0, signals }
}

export const hasNote = (note: string | undefined): boolean => (note ?? '').trim().length >= NOTE_MIN_CHARS

/** Record a strike on the rider of an attempt, with its reason, the captain and the time. The third active strike escalates the rider. */
export function recordStrike(s: S, at: number, st: StopRecord, riderId: string, reason: StrikeReason, note: string | undefined): S {
  const record: StrikeRecord = {
    id: `k${s.nextId}`,
    riderId,
    orderId: st.order.id,
    simAt: s.simNow,
    reason,
    ...(hasNote(note) ? { note: (note ?? '').trim().slice(0, 140) } : {}),
    captainName: captainName(s.hub),
  }
  let next: S = { ...s, strikeLog: [...s.strikeLog, record], nextId: s.nextId + 1 }
  next = emit(next, at, 'STRIKE', { riderId, strikeId: record.id, reason, captainName: record.captainName }, { orderId: st.order.id, riderId })
  const count = activeCount(next, riderId)
  next = feedAdd(next, at, 'suspect', `Strike ${count} for ${riderName(s, riderId)}: ${STRIKE_REASON_LABEL[reason].toLowerCase()} on ${st.order.awb} (decided by ${record.captainName})`, st.order.id)
  if (count === 3) {
    next = emit(next, at, 'RIDER_ESCALATED', { riderId }, { riderId })
    next = feedAdd(next, at, 'suspect', `${riderName(s, riderId)} now has 3 active strikes: escalated to the hub manager for a decision outside the app`, st.order.id)
  }
  return next
}

/** Ops overturns a strike. Only within 48 h of it being issued, only once. The rider sees "overturned". */
export function overturnStrike(s: S, a: { readonly at: number; readonly strikeId: string }): S {
  const k = s.strikeLog.find((x) => x.id === a.strikeId)
  if (!k || k.overturnedSim !== undefined || s.simNow - k.simAt > OVERTURN_WINDOW_MS) return s
  let next: S = { ...s, strikeLog: s.strikeLog.map((x) => (x.id === k.id ? { ...x, overturnedSim: s.simNow } : x)) }
  next = emit(next, a.at, 'STRIKE_OVERTURNED', { riderId: k.riderId, strikeId: k.id }, { orderId: k.orderId, riderId: k.riderId })
  return feedAdd(next, a.at, 'info', `Ops overturned a strike on ${riderName(s, k.riderId)} (${s.stops[k.orderId]?.order.awb ?? k.orderId}) within 48 h`, k.orderId)
}

/** The rider taps "Ask for a review" on a strike: it is flagged for Ops. Once per strike. */
export function askReview(s: S, a: { readonly at: number; readonly strikeId: string }): S {
  const k = s.strikeLog.find((x) => x.id === a.strikeId)
  if (!k || k.overturnedSim !== undefined || k.reviewAskedSim !== undefined) return s
  let next: S = { ...s, strikeLog: s.strikeLog.map((x) => (x.id === k.id ? { ...x, reviewAskedSim: s.simNow } : x)) }
  next = emit(next, a.at, 'REVIEW_ASKED', { riderId: k.riderId, strikeId: k.id }, { orderId: k.orderId, riderId: k.riderId })
  return feedAdd(next, a.at, 'info', `${riderName(s, k.riderId)} asked for a review of a strike on ${s.stops[k.orderId]?.order.awb ?? k.orderId}: flagged for Ops`, k.orderId)
}

const describeWeak = (e: { readonly gpsDistM: number; readonly calls: number; readonly waitMin: number } | undefined): string => {
  if (!e) return 'no evidence was logged at the door'
  const parts: string[] = []
  if (e.gpsDistM > EVIDENCE_RULE.genuineMaxM) parts.push(`the phone was ${Math.round(e.gpsDistM)} m away`)
  if (e.calls < EVIDENCE_RULE.minCalls) parts.push(e.calls === 0 ? 'no calls were logged' : `only ${e.calls} call${e.calls === 1 ? '' : 's'} logged`)
  if (e.waitMin < EVIDENCE_RULE.minWaitMin) parts.push(e.waitMin === 0 ? 'no waiting time was logged' : `waited only ${e.waitMin} min`)
  return parts.length === 0 ? 'the evidence was not strong enough' : parts.join(', ')
}

/**
 * The parking gap. A flagged order is delivered by the SAME rider whose own earlier attempt on it was weak (not high confidence, not cleared by the
 * captain): the bonus accrues, but waits for the captain inside the 7-day window. If the customer confirmed on WhatsApp that the rider came, there is
 * nothing to decide and it is cleared at once. Returns undefined when no earlier attempt of this rider was weak.
 */
export function parkingGapReview(st: StopRecord, riderId: string): BonusReview | undefined {
  const weak = (st.attemptLog ?? []).filter((a) => a.riderId === riderId && a.confidence !== 'high' && a.cleared !== true)
  if (weak.length === 0) return undefined
  const last = weak[weak.length - 1]
  const view = { gpsDistM: last.evidence?.gpsDistM ?? null, calls: last.evidence?.calls ?? null, waitMin: last.evidence?.waitMin ?? null, reached: last.reached }
  const why = `your earlier attempt had ${describeWeak(last.evidence)}`
  return weak.every((a) => a.reached === true) ? { state: 'cleared', why, weak: view, auto: 'customer_confirmed' } : { state: 'waiting', why, weak: view }
}

/** Bonus holds waiting for the captain: accrued or pending, with a waiting review */
export const heldBonuses = (s: S): readonly S['ledger'][number][] => s.ledger.filter((l) => (l.status === 'accrued' || l.status === 'pending') && l.review?.state === 'waiting')

/** The captain releases (it carries on to the normal release at day 7) or withholds (a reason chip is required) a held bonus. */
export function reviewBonus(s: S, a: { readonly at: number; readonly orderId: string; readonly decision: 'release' | 'withhold'; readonly reason?: StrikeReason; readonly note?: string }): S {
  const entry = heldBonuses(s).find((l) => l.orderId === a.orderId)
  if (!entry || entry.review === undefined) return s
  if (a.decision === 'withhold' && (a.reason === undefined || !STRIKE_REASONS.includes(a.reason))) return s
  const name = captainName(s.hub)
  const note = hasNote(a.note) ? (a.note ?? '').trim().slice(0, 140) : undefined
  const base = { ...entry.review, decidedSim: s.simNow, captainName: name, ...(note === undefined ? {} : { note }) }
  let next: S
  if (a.decision === 'release') {
    next = { ...s, ledger: s.ledger.map((l) => (l.id === entry.id ? { ...l, review: { ...base, state: 'cleared' as const } } : l)) }
    next = emit(next, a.at, 'BONUS_REVIEWED', { decision: 'release', captainName: name }, { orderId: a.orderId, riderId: entry.riderId })
    next = feedAdd(next, a.at, 'bonus', `${name} released the held ₹${entry.amount} for ${riderName(s, entry.riderId)}`, a.orderId)
  } else {
    const reason = a.reason as StrikeReason
    const text = `withheld by ${name}: ${STRIKE_REASON_LABEL[reason].toLowerCase()}`
    next = { ...s, ledger: s.ledger.map((l) => (l.id === entry.id ? { ...l, status: 'blocked' as const, reason: text, review: { ...base, state: 'withheld' as const, reason } } : l)) }
    next = emit(next, a.at, 'BONUS_REVIEWED', { decision: 'withhold', captainName: name, reason }, { orderId: a.orderId, riderId: entry.riderId })
    next = emit(next, a.at, 'BONUS_BLOCKED', { amount: entry.amount, reason: text, afterAccrual: true }, { orderId: a.orderId, riderId: entry.riderId })
    next = feedAdd(next, a.at, 'bonus', `₹${entry.amount} for ${riderName(s, entry.riderId)} ${text}`, a.orderId)
  }
  return bookCost(next, a.at, 'Bonus hold review labour', REVIEW_COST, 'Valmo', 'bonus', a.orderId)
}
