import { costPerSuccessfulDelivery } from '../engine/economics.ts'
import { mean } from '../engine/math.ts'
import { type DaySummary, type Lane, type RouteDecision, type RouteOptions } from '../engine/router.ts'
import type { Arm, Rider } from '../engine/types.ts'
import { isDelivered, isSettled, isTerminal } from './lifecycle.ts'
import { ledgerTotals } from './ledger.ts'
import { decisionFor, routeOptionsFor } from './routing.ts'
import type { DayState, ExceptionItem, ParcelRecord, StopRecord, WaMessage } from './types.ts'

/** One arm's flagged orders. `n` counts every flagged order in the arm; the rate is over those with a final outcome only. */
export interface ArmRate {
  /** All flagged orders in the arm (the denominator no order ever leaves) */
  readonly n: number
  /** Of those, orders in a terminal state */
  readonly terminal: number
  /** Not finished yet: out for delivery, failed and waiting, rescheduled, refused and waiting on the desk */
  readonly open: number
  readonly delivered: number
  /** delivered / terminal. The final rate the verdict uses. */
  readonly rate: number
  /** Orders attempted at least once and delivered or failed as it stands (failed orders may still be retried) */
  readonly settled: number
  /** delivered / settled: a provisional "as it stands" rate for a day that is still running. Never used for a decision. */
  readonly settledRate: number
}

export interface Kpis {
  readonly orders: number
  readonly flagged: number
  readonly delivered: number
  /** Failed attempts waiting for a decision (not home, unreachable, address) */
  readonly attempted: number
  readonly refused: number
  readonly rescheduled: number
  /** Orders that went back as an RTO */
  readonly rto: number
  /** Out for delivery, including waiting on an OTP */
  readonly pending: number
  /** Orders that were attempted and ended as delivered or failed as it stands: delivered + attempted + refused + rto + rehomed */
  readonly resolved: number
  /** Orders with a final outcome, and orders still open */
  readonly terminal: number
  readonly open: number
  readonly successRate: number
  readonly realisedRto: number
  /** Expected RTO for today's mix without the bonus (the simulation's baseline), so realised RTO shows the bonus effect */
  readonly modelledRto: number
  readonly costPerSuccessful: number
  readonly flaggedBonus: ArmRate
  readonly flaggedControl: ArmRate
  /** Accrued + pending: promised to riders, not yet paid */
  readonly bonusPending: number
  readonly bonusReleased: number
  readonly bonusClawedBack: number
  readonly bonusBlocked: number
  /** What the day could pay if every Bonus-Eligible order on a Bonus rider were delivered */
  readonly bonusBudget: number
  readonly suspect: number
}

const armRate = (inArm: readonly StopRecord[]): ArmRate => {
  const done = inArm.filter((x) => isTerminal(x.status))
  const delivered = done.filter((x) => isDelivered(x.status)).length
  const settled = inArm.filter((x) => isSettled(x.status)).length
  return {
    n: inArm.length,
    terminal: done.length,
    open: inArm.length - done.length,
    delivered,
    rate: done.length === 0 ? 0 : delivered / done.length,
    settled,
    settledRate: settled === 0 ? 0 : delivered / settled,
  }
}

export const stopsOf = (s: DayState): readonly StopRecord[] => s.stopOrder.map((id) => s.stops[id])

/**
 * How well the Rescue Score picks the orders that fail. `catchShare` is the flagged orders' share of all the day's failures (the simulation's own
 * failure chance, `pRto`); `randomShare` is what picking the same number of orders at random would catch; `perfectShare` is the best any score could do.
 * This is in SIMULATION: the generator builds the failure chance from the same factors the score uses, so it flatters the score.
 */
export interface ScoreAccuracy {
  readonly flaggedShare: number
  readonly catchShare: number
  readonly randomShare: number
  readonly perfectShare: number
}

export function scoreAccuracy(s: DayState): ScoreAccuracy {
  const stops = stopsOf(s)
  const total = stops.reduce((t, x) => t + x.pRto, 0)
  if (stops.length === 0 || total === 0) return { flaggedShare: 0, catchShare: 0, randomShare: 0, perfectShare: 0 }
  const flagged = stops.filter((x) => x.flagged)
  const worst = [...stops].sort((a, b) => b.pRto - a.pRto).slice(0, flagged.length)
  const share = (xs: readonly StopRecord[]): number => xs.reduce((t, x) => t + x.pRto, 0) / total
  const flaggedShare = flagged.length / stops.length
  return { flaggedShare, catchShare: share(flagged), randomShare: flaggedShare, perfectShare: share(worst) }
}

/** Flagged orders of one arm, by the arm stamped at dispatch. Re-homed parcels (their own cohort) and cancelled orders are not part of the pilot. */
const flaggedInArm = (stops: readonly StopRecord[], a: Arm): readonly StopRecord[] =>
  stops.filter((x) => x.flagged && x.arm === a && x.rehomedFrom === undefined && x.status !== 'cancelled')

export function kpis(s: DayState): Kpis {
  const stops = stopsOf(s)
  const count = (status: StopRecord['status']): number => stops.filter((x) => x.status === status).length
  const delivered = stops.filter((x) => isDelivered(x.status)).length
  const attempted = count('ndr')
  const refused = count('refused')
  const rto = count('rto')
  const rehomed = count('rehomed')
  // A hub pickup is an attempted order that was not delivered: it is in the denominator, like a re-home, and never a delivery.
  const resolved = delivered + attempted + refused + rto + rehomed + count('hub_pickup')
  const terminal = stops.filter((x) => isTerminal(x.status)).length
  const modelledRto = mean(stops.map((x) => x.pRto))
  const realisedRto = resolved === 0 ? 0 : (attempted + refused + rto) / resolved
  const flagged = stops.filter((x) => x.flagged)
  const totals = ledgerTotals(s)
  return {
    orders: stops.length,
    flagged: flagged.length,
    delivered,
    attempted,
    refused,
    rescheduled: count('rescheduled'),
    rto,
    pending: count('scored') + count('out_for_delivery') + count('otp_sent'),
    resolved,
    terminal,
    open: stops.length - terminal,
    successRate: resolved === 0 ? 0 : delivered / resolved,
    realisedRto,
    modelledRto,
    costPerSuccessful: costPerSuccessfulDelivery(resolved === 0 ? modelledRto : realisedRto),
    flaggedBonus: armRate(flaggedInArm(stops, 'bonus')),
    flaggedControl: armRate(flaggedInArm(stops, 'control')),
    bonusPending: totals.liability,
    bonusReleased: totals.released,
    bonusClawedBack: totals.clawedBack,
    bonusBlocked: totals.blocked,
    bonusBudget: flaggedInArm(stops, 'bonus').length * s.config.bonus,
    suspect: stops.filter((x) => x.assessment?.status === 'suspect').length,
  }
}

export const riderBag = (s: DayState, riderId: string): readonly StopRecord[] =>
  stopsOf(s)
    .filter((x) => x.riderId === riderId)
    .sort((a, b) => a.seq - b.seq)

export interface Earnings {
  readonly deliveries: number
  readonly base: number
  /** Accrued + pending */
  readonly bonusPending: number
  readonly bonusReleased: number
  readonly bonusClawedBack: number
  readonly bonusBlocked: number
  readonly total: number
}

export function riderEarnings(s: DayState, riderId: string): Earnings {
  const deliveries = riderBag(s, riderId).filter((x) => isDelivered(x.status)).length
  const mine = s.ledger.filter((l) => l.riderId === riderId)
  const sum = (...statuses: string[]): number => mine.filter((l) => statuses.includes(l.status)).reduce((t, l) => t + l.amount, 0)
  const base = deliveries * s.config.basePay
  const bonusPending = sum('accrued', 'pending')
  const bonusReleased = sum('released')
  return { deliveries, base, bonusPending, bonusReleased, bonusClawedBack: sum('clawed_back'), bonusBlocked: sum('blocked'), total: base + bonusPending + bonusReleased }
}

/** The two riders the live demo drives: the ones holding the reserved demo stops (before the day starts, the first of each arm). */
export function demoRiders(s: DayState): { readonly bonus?: Rider; readonly control?: Rider } {
  const pick = (arm: Rider['arm']): Rider | undefined => {
    const mine = s.riders.filter((r) => r.arm === arm)
    const holder = mine.find((r) => stopsOf(s).some((x) => x.manual && x.rehomedFrom === undefined && x.riderId === r.id))
    return holder ?? mine[0]
  }
  return { bonus: pick('bonus'), control: pick('control') }
}

export const messagesFor = (s: DayState, orderId: string): readonly WaMessage[] => s.messages.filter((m) => m.orderId === orderId)

export interface DeskItem {
  readonly record: ParcelRecord
  readonly decision: RouteDecision
  /** What the Router was told about the day (shelf, bag space, assumptions): a what-if preview prices with the same ones */
  readonly options: RouteOptions
  /** How the customer pays for this order: a COD pickup at the hub can note that the cash was taken there */
  readonly payment: 'COD' | 'PREPAID'
}

export const deskItems = (s: DayState): readonly DeskItem[] =>
  s.parcels.map((record) => ({ record, decision: decisionFor(s, record), options: routeOptionsFor(s, record), payment: s.stops[record.orderId]?.order.payment ?? 'COD' }))

/** Day summary for parcels still waiting for a decision, versus sending them all back. */
export function deskSummary(s: DayState): DaySummary {
  const decisions = s.parcels.filter((p) => p.state === 'queued').map((p) => decisionFor(s, p))
  const count = (lane: Lane): number => decisions.filter((d) => d.lane === lane).length
  return {
    counts: { second_chance: count('second_chance'), hold_rehome: count('hold_rehome'), consolidated_return: count('consolidated_return') },
    total: decisions.length,
    sendBackCost: decisions.length * 120,
    savedMin: decisions.reduce((t, d) => t + d.effect.min, 0),
    savedMax: decisions.reduce((t, d) => t + d.effect.max, 0),
  }
}

/** Disputed attempts waiting for Ops, oldest first */
export const openExceptions = (s: DayState): readonly ExceptionItem[] => s.exceptions.filter((e) => e.status === 'open')

export interface RiderAttemptRecord {
  readonly riderId: string
  /** Failed attempts the rider logged */
  readonly attempts: number
  readonly strikes: number
  /** Confirmed fake attempts / attempts logged */
  readonly fakeRate: number
}

/** Per rider: attempts logged and confirmed fake (strikes). Feeds the roster column and the false-attempt guardrail. */
export function attemptRecords(s: DayState): readonly RiderAttemptRecord[] {
  return s.riders.map((r) => {
    const attempts = s.events.filter((e) => e.type === 'ATTEMPT_LOGGED' && e.riderId === r.id).length
    const strikes = s.strikes[r.id] ?? 0
    return { riderId: r.id, attempts, strikes, fakeRate: attempts === 0 ? 0 : strikes / attempts }
  })
}

export const suspectStops = (s: DayState): readonly StopRecord[] => stopsOf(s).filter((x) => x.assessment?.status === 'suspect')

/** Stops reserved for the live demo, in bag order: the first Bonus rider's and the first Control rider's flagged orders. */
export function demoStops(s: DayState): { readonly bonus: readonly string[]; readonly control: readonly string[] } {
  const { bonus, control } = demoRiders(s)
  const ids = (riderId: string | undefined): readonly string[] =>
    stopsOf(s)
      .filter((x) => x.manual && x.riderId === riderId && x.rehomedFrom === undefined)
      .sort((a, b) => a.seq - b.seq)
      .map((x) => x.order.id)
  return { bonus: ids(bonus?.id), control: ids(control?.id) }
}

export const parcelForOrder = (s: DayState, orderId: string): ParcelRecord | undefined => s.parcels.find((p) => p.orderId === orderId)
