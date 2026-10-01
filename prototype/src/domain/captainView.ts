import { median } from '../engine/math.ts'
import { DAY_MS, HOUR_MS } from './clock.ts'
import { activeStrikes, enhancedReview, ladderStep, OVERTURN_WINDOW_MS, REVIEW_COST, STRIKE_ACTIVE_MS, STRIKE_REASON_LABEL, type LadderStep } from './captain.ts'
import { isDelivered } from './lifecycle.ts'
import { costLedger } from './ledger.ts'
import { riderName } from './helpers.ts'
import type { DayState, ExceptionItem, StrikeRecord } from './types.ts'

/**
 * What the hub captain, Ops and the rider see about fake-attempt control: the rider monitor, the timeline, the captain scorecard and the
 * outcome numbers. Everything is derived from the day's own record. Nothing here reads the pilot verdict, and nothing needs the bonus.
 */

/** "Watch": at least 3 disputed attempts in 7 days and a disputed rate at least twice the hub median */
export const WATCH_DISPUTES = 3
export const WATCH_MULTIPLE = 2
export const WATCH_WINDOW_MS = 7 * DAY_MS
/** The hub median is taken over riders with at least this many attempts */
export const MEDIAN_MIN_ATTEMPTS = 5

export type MonitorStatus = 'Clear' | 'Watch' | 'Warning' | 'Escalated'

export interface RiderMonitorRow {
  readonly riderId: string
  readonly name: string
  readonly arm: 'bonus' | 'control'
  /** Failed attempts the rider logged */
  readonly attempts: number
  /** Attempts disputed: opened as an exception because the evidence was weak or the customer disagreed */
  readonly disputed: number
  /** Active strikes (inside 30 days, not overturned) */
  readonly strikes: number
  readonly disputedRate: number
  readonly hubMedian: number
  readonly status: MonitorStatus
  readonly step: LadderStep
  /** On the enhanced-review step: every failed attempt is reviewed */
  readonly enhanced: boolean
  /** One line: why the rider has this status */
  readonly why: string
  readonly lastDecision?: string
  /** A weak attempt, then the same rider delivered the order (the parking-gap check) */
  readonly deferrals: number
}

const disputedEvents = (s: DayState, riderId: string) => s.events.filter((e) => e.type === 'EXCEPTION_OPENED' && e.riderId === riderId && e.data.enhanced !== true)
const attemptCount = (s: DayState, riderId: string): number => s.events.filter((e) => e.type === 'ATTEMPT_LOGGED' && e.riderId === riderId).length

/** Median of the disputed rate over the riders with at least 5 attempts (0 when nobody has that many yet) */
export function hubMedianDisputedRate(s: DayState): number {
  const rates = s.riders
    .map((r) => ({ attempts: attemptCount(s, r.id), disputed: disputedEvents(s, r.id).length }))
    .filter((r) => r.attempts >= MEDIAN_MIN_ATTEMPTS)
    .map((r) => r.disputed / r.attempts)
  return rates.length === 0 ? 0 : median(rates)
}

const decisionText = (s: DayState, e: ExceptionItem): string => {
  const awb = s.stops[e.orderId]?.order.awb ?? e.orderId
  const what = e.action === 'strike' ? 'strike' : e.action === 'confirm' ? 'confirmed valid' : 'free re-attempt'
  return `${what} on ${awb}${e.captainMissed ? ' (the captain did not decide)' : ''}`
}

export function riderMonitor(s: DayState): readonly RiderMonitorRow[] {
  const median = hubMedianDisputedRate(s)
  return s.riders.map((r) => {
    const attempts = attemptCount(s, r.id)
    const mine = disputedEvents(s, r.id)
    const recent = mine.filter((e) => s.simNow - e.simAt < WATCH_WINDOW_MS).length
    const strikes = activeStrikes(s, r.id).length
    const rate = attempts === 0 ? 0 : mine.length / attempts
    const step = ladderStep(strikes)
    const watch = strikes === 0 && recent >= WATCH_DISPUTES && rate >= WATCH_MULTIPLE * median
    const status: MonitorStatus = step === 'escalated' ? 'Escalated' : step !== 'clear' ? 'Warning' : watch ? 'Watch' : 'Clear'
    const last = [...s.exceptions].filter((e) => e.riderId === r.id && e.status === 'resolved').sort((a, b) => (b.resolvedSim ?? 0) - (a.resolvedSim ?? 0))[0]
    const why =
      status === 'Escalated'
        ? `${strikes} active strikes: the hub manager decides, outside the app`
        : status === 'Warning'
          ? strikes >= 2
            ? `${strikes} active strikes: every failed attempt is reviewed for 14 days and any bonus is blocked`
            : '1 active strike: a warning and a coaching note'
          : status === 'Watch'
            ? `${recent} disputed attempts in 7 days, and a disputed rate of ${(rate * 100).toFixed(0)}% against a hub median of ${(median * 100).toFixed(0)}% (the rule: at least ${WATCH_DISPUTES} in 7 days and ${WATCH_MULTIPLE}× the median)`
            : 'nothing to act on'
    const deferrals = s.ledger.filter((l) => l.riderId === r.id && l.review !== undefined).length
    return {
      riderId: r.id,
      name: riderName(s, r.id),
      arm: r.arm,
      attempts,
      disputed: mine.length,
      strikes,
      disputedRate: rate,
      hubMedian: median,
      status,
      step,
      enhanced: enhancedReview(s, r.id),
      why,
      ...(last ? { lastDecision: decisionText(s, last) } : {}),
      deferrals,
    }
  })
}

export interface TimelineItem {
  readonly simAt: number
  readonly kind: 'disputed' | 'decision' | 'strike' | 'overturned' | 'review_asked' | 'bonus_held' | 'bonus_decision'
  readonly text: string
  readonly orderId?: string
}

/** Every disputed attempt and every decision about one rider, oldest first */
export function riderTimeline(s: DayState, riderId: string): readonly TimelineItem[] {
  const awb = (orderId: string | undefined): string => (orderId === undefined ? '' : (s.stops[orderId]?.order.awb ?? orderId))
  const out: TimelineItem[] = []
  for (const e of s.events) {
    if (e.riderId !== riderId) continue
    const ref = { ...(e.orderId === undefined ? {} : { orderId: e.orderId }) }
    if (e.type === 'EXCEPTION_OPENED' && e.data.enhanced !== true) {
      const ev = s.stops[e.orderId ?? '']?.evidence
      out.push({ simAt: e.simAt, kind: 'disputed', ...ref, text: `Disputed attempt on ${awb(e.orderId)}${ev ? `: ${Math.round(ev.gpsDistM)} m away, ${ev.calls} calls, waited ${ev.waitMin} min` : ''}` })
    } else if (e.type === 'EXCEPTION_RESOLVED') {
      const item = s.exceptions.find((x) => x.orderId === e.orderId && x.riderId === riderId && x.status === 'resolved')
      if (item) out.push({ simAt: e.simAt, kind: 'decision', ...ref, text: `Decision: ${decisionText(s, item)}${item.reason ? ` · ${STRIKE_REASON_LABEL[item.reason]}` : ''}` })
    } else if (e.type === 'STRIKE') {
      out.push({ simAt: e.simAt, kind: 'strike', ...ref, text: `Strike: ${STRIKE_REASON_LABEL[(e.data.reason as StrikeRecord['reason']) ?? 'other']}` })
    } else if (e.type === 'STRIKE_OVERTURNED') {
      out.push({ simAt: e.simAt, kind: 'overturned', ...ref, text: 'Ops overturned the strike' })
    } else if (e.type === 'REVIEW_ASKED') {
      out.push({ simAt: e.simAt, kind: 'review_asked', ...ref, text: 'The rider asked for a review' })
    } else if (e.type === 'BONUS_HELD') {
      out.push({ simAt: e.simAt, kind: 'bonus_held', ...ref, text: `₹${String(e.data.amount)} held for the captain: ${String(e.data.why)}` })
    } else if (e.type === 'BONUS_REVIEWED') {
      out.push({ simAt: e.simAt, kind: 'bonus_decision', ...ref, text: `Held bonus ${e.data.decision === 'release' ? 'released' : 'withheld'} by ${String(e.data.captainName)}` })
    }
  }
  return out
}

export interface Scorecard {
  /** Disputed attempts opened */
  readonly opened: number
  /** Decided by the captain (not by the 24 h default) */
  readonly decided: number
  readonly autoExpired: number
  /** decided / (decided + autoExpired); undefined until something was resolved */
  readonly decidedInTimeShare: number | undefined
  readonly strikes: number
  readonly overturned: number
  readonly reviewsAsked: number
  readonly stillOpen: number
}

export function captainScorecard(s: DayState): Scorecard {
  // A dispute closed because a re-attempt was set up by hand (overtaken) was not decided by anyone: it is left out of both counts.
  const resolved = s.exceptions.filter((e) => e.status === 'resolved' && e.overtaken !== true)
  const autoExpired = resolved.filter((e) => e.captainMissed === true).length
  const decided = resolved.length - autoExpired
  return {
    opened: s.exceptions.length,
    decided,
    autoExpired,
    decidedInTimeShare: resolved.length === 0 ? undefined : decided / resolved.length,
    strikes: s.strikeLog.length,
    overturned: s.strikeLog.filter((k) => k.overturnedSim !== undefined).length,
    reviewsAsked: s.strikeLog.filter((k) => k.reviewAskedSim !== undefined).length,
    stillOpen: s.exceptions.filter((e) => e.status === 'open').length,
  }
}

export interface StrikeView {
  readonly state: 'active' | 'overturned' | 'expired'
  /** Days until it stops counting (active only) */
  readonly daysLeft: number
  /** Ops can still overturn it (inside 48 h, not already overturned) */
  readonly canOverturn: boolean
  /** The rider can still ask for a review */
  readonly canAskReview: boolean
}

export function strikeView(s: DayState, k: StrikeRecord): StrikeView {
  const age = s.simNow - k.simAt
  const state = k.overturnedSim !== undefined ? 'overturned' : age >= STRIKE_ACTIVE_MS ? 'expired' : 'active'
  return {
    state,
    daysLeft: state === 'active' ? Math.max(0, Math.ceil((STRIKE_ACTIVE_MS - age) / DAY_MS)) : 0,
    canOverturn: state === 'active' && age <= OVERTURN_WINDOW_MS,
    canAskReview: state === 'active' && k.reviewAskedSim === undefined,
  }
}

/** ₹ saved by a recovered delivery: the ₹120 return avoided less the ₹21 re-attempt */
export const RECOVERED_VALUE = 99
/** A fake attempt's outcome numbers are "too early" until this many attempts have been logged */
export const KPI_MIN_ATTEMPTS = 30

export interface OutcomeKpis {
  readonly attempts: number
  readonly disputed: number
  /** Strikes issued (confirmed fake) */
  readonly confirmedFake: number
  /** Confirmed valid by the captain */
  readonly cleared: number
  readonly autoExpired: number
  readonly overturned: number
  readonly medianHoursToDecide: number | undefined
  /** Free re-attempt or strike orders that ended delivered */
  readonly recovered: number
  /** Human reviews: a captain decision on a dispute or on a held bonus (₹10 each) */
  readonly reviews: number
  readonly savedGross: number
  readonly reviewCost: number
  /** ₹15 paid (not blocked, not clawed back) on the recovered deliveries in the Bonus arm: the rider who delivers is paid, so it is not a saving */
  readonly bonusPaidOnRecovered: number
  readonly netSaved: number
  /** Share of person-reviewed disputes that ended in a recovered delivery; undefined until something was reviewed */
  readonly recoveryShare: number | undefined
  /** A review pays when more than this share ends in a delivery: ₹10 ÷ ₹99 */
  readonly breakEvenShare: number
  /** At least 30 attempts have been logged */
  readonly enough: boolean
}

export function outcomeKpis(s: DayState): OutcomeKpis {
  const attempts = s.events.filter((e) => e.type === 'ATTEMPT_LOGGED').length
  const resolved = s.exceptions.filter((e) => e.status === 'resolved' && e.overtaken !== true)
  const byPerson = resolved.filter((e) => e.captainMissed !== true)
  const recoveredItems = resolved.filter((e) => (e.action === 'free_reattempt' || e.action === 'strike') && isDelivered(s.stops[e.orderId]?.status ?? 'scored'))
  const costs = costLedger(s)
  const reviews = (costs.find((c) => c.line === 'Exception review labour')?.count ?? 0) + (costs.find((c) => c.line === 'Bonus hold review labour')?.count ?? 0)
  const recoveredIds = new Set(recoveredItems.map((e) => e.orderId))
  const bonusPaid = s.ledger.filter((l) => recoveredIds.has(l.orderId) && l.status !== 'blocked' && l.status !== 'clawed_back').reduce((t, l) => t + l.amount, 0)
  const savedGross = recoveredItems.length * RECOVERED_VALUE
  const reviewCost = reviews * REVIEW_COST
  const hours = byPerson.map((e) => ((e.resolvedSim ?? e.openedSim) - e.openedSim) / HOUR_MS)
  const reviewedRecovered = recoveredItems.filter((e) => e.captainMissed !== true).length
  return {
    attempts,
    disputed: s.events.filter((e) => e.type === 'EXCEPTION_OPENED' && e.data.enhanced !== true).length,
    confirmedFake: s.strikeLog.length,
    cleared: byPerson.filter((e) => e.action === 'confirm').length,
    autoExpired: resolved.length - byPerson.length,
    overturned: s.strikeLog.filter((k) => k.overturnedSim !== undefined).length,
    medianHoursToDecide: hours.length === 0 ? undefined : median(hours),
    recovered: recoveredItems.length,
    reviews,
    savedGross,
    reviewCost,
    bonusPaidOnRecovered: bonusPaid,
    netSaved: savedGross - reviewCost - bonusPaid,
    recoveryShare: byPerson.length === 0 ? undefined : reviewedRecovered / byPerson.length,
    breakEvenShare: REVIEW_COST / RECOVERED_VALUE,
    enough: attempts >= KPI_MIN_ATTEMPTS,
  }
}
