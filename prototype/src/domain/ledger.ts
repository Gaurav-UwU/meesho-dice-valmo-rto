import { activeCount, parkingGapReview } from './captain.ts'
import { emit } from './events.ts'
import { DAY_MS, codReconciliationTime, dayIndex } from './clock.ts'
import { bookCost, feedAdd, riderName, WHATSAPP_COST, type S } from './helpers.ts'
import { isDelivered, isSettled } from './lifecycle.ts'
import type { LedgerEntry, LedgerStatus, StopRecord } from './types.ts'

/**
 * The Rescue Bonus ledger (prototype spec C).
 *   accrued -> pending -> released, or -> clawed_back, or blocked (at accrual).
 * Prepaid orders go straight to pending (the OTP proves the delivery). COD orders wait for the rider's cash to be reconciled.
 * A pending bonus is released once the 7-day return window has closed with no return; a return inside the window claws it back.
 */
export const RETURN_WINDOW_MS = 7 * DAY_MS
export const DAILY_CAP = 300
export const STRIKE_LIMIT = 2
/** A rider whose normal-order success falls this far below the Control arm's (points), with enough orders to tell, earns no bonus */
export const NORMAL_FLOOR_PTS = 3
export const NORMAL_FLOOR_MIN_ORDERS = 10

const stopsOf = (s: S): readonly StopRecord[] => s.stopOrder.map((id) => s.stops[id])

/** Normal-order success of the orders a rider was first given. Settled orders count: a failed order still waiting for its retry is a failure so far, not a missing one. */
function normalRate(s: S, pick: (x: StopRecord) => boolean): { readonly n: number; readonly rate: number } {
  const done = stopsOf(s).filter((x) => !x.flagged && x.rehomedFrom === undefined && isSettled(x.status) && pick(x))
  return { n: done.length, rate: done.length === 0 ? 0 : done.filter((x) => isDelivered(x.status)).length / done.length }
}

export function normalFloorBreached(s: S, riderId: string): boolean {
  const mine = normalRate(s, (x) => x.originalRiderId === riderId)
  if (mine.n < NORMAL_FLOOR_MIN_ORDERS) return false
  const control = normalRate(s, (x) => x.arm === 'control')
  return control.n > 0 && mine.rate < control.rate - NORMAL_FLOOR_PTS / 100
}

/** Why a bonus that would otherwise accrue is blocked, if it is. */
export function blockReason(s: S, orderId: string, riderId: string, at: number): string | undefined {
  const st = s.stops[orderId]
  if (st.suspectRiderIds?.includes(riderId) || (st.assessment?.bonusBlocked && st.attemptRiderId === riderId)) return 'an earlier attempt by this rider on this order looked fake'
  if (activeCount(s, riderId) >= STRIKE_LIMIT) return `rider has ${STRIKE_LIMIT} active strikes (confirmed fake attempts in the last 30 days)`
  const today = dayIndex(s.simNow)
  const earnedToday = s.ledger.filter((l) => l.riderId === riderId && l.status !== 'blocked' && l.status !== 'clawed_back' && dayIndex(l.deliveredSim) === today).reduce((t, l) => t + l.amount, 0)
  if (earnedToday + s.config.bonus > DAILY_CAP) return `daily bonus cap of ₹${DAILY_CAP} reached`
  if (normalFloorBreached(s, riderId)) return `normal-order success is more than ${NORMAL_FLOOR_PTS} points below the Control arm`
  void at
  return undefined
}

const setEntry = (s: S, id: string, patch: Partial<LedgerEntry>): S => ({ ...s, ledger: s.ledger.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

/** A flagged Bonus-arm order was just delivered by `st.riderId`: accrue, or block, the bonus. */
export function accrueBonus(s: S, orderId: string, at: number): S {
  const st = s.stops[orderId]
  if (!st.flagged || st.arm !== 'bonus') return s
  // A day with the bonus off (bonus 0) creates no ledger rows at all: fake-attempt control works the same without a bonus.
  if (!(s.config.bonus > 0)) return s
  const amount = s.config.bonus
  const riderId = st.riderId
  const reason = blockReason(s, orderId, riderId, at)
  const cod = st.order.payment === 'COD'
  // The parking gap: a weak earlier attempt by this same rider makes the bonus wait for the hub captain (it never blocks it outright).
  const review = reason ? undefined : parkingGapReview(st, riderId)
  const status: LedgerStatus = reason ? 'blocked' : cod ? 'accrued' : 'pending'
  const entry: LedgerEntry = { id: `l${s.nextId}`, orderId, riderId, amount, status, at, deliveredSim: s.simNow, cod, ...(reason ? { reason } : {}), ...(review ? { review } : {}) }
  let next: S = { ...s, ledger: [...s.ledger, entry], nextId: s.nextId + 1 }
  if (reason) {
    next = emit(next, at, 'BONUS_BLOCKED', { amount, reason }, { orderId, riderId })
    return feedAdd(next, at, 'bonus', `₹${amount} bonus withheld: ${reason}`, orderId)
  }
  next = emit(next, at, 'BONUS_ACCRUED', { amount }, { orderId, riderId })
  if (!cod) next = emit(next, at, 'BONUS_PENDING', { amount }, { orderId, riderId })
  if (review?.state === 'waiting') {
    next = emit(next, at, 'BONUS_HELD', { amount, why: review.why }, { orderId, riderId })
    next = feedAdd(next, at, 'bonus', `₹${amount} for ${riderName(s, riderId)} waits for the hub captain: ${review.why}`, orderId)
  }
  return feedAdd(
    next,
    at,
    'bonus',
    cod
      ? `₹${amount} Rescue Bonus accrued for ${riderName(s, riderId)} (COD: pending once the cash is reconciled, then held for the return window)`
      : `₹${amount} Rescue Bonus credited to ${riderName(s, riderId)} (pending until the return window closes)`,
    orderId,
  )
}

/**
 * Riders hand their cash in at 20:00. Every delivered COD order whose cash is due (or all of them, with `force`) is reconciled,
 * and its accrued bonus becomes pending.
 */
export function reconcileCod(s: S, at: number, force = false): S {
  const due = stopsOf(s).filter((x) => isDelivered(x.status) && x.order.payment === 'COD' && !x.codReconciled && x.deliveredSim !== undefined && (force || s.simNow >= codReconciliationTime(x.deliveredSim)))
  if (due.length === 0) return s
  let next = s
  const byRider = new Map<string, number>()
  for (const x of due) {
    byRider.set(x.riderId, (byRider.get(x.riderId) ?? 0) + x.order.value)
    next = { ...next, stops: { ...next.stops, [x.order.id]: { ...next.stops[x.order.id], codReconciled: true } } }
  }
  for (const [riderId, amount] of [...byRider.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) next = emit(next, at, 'COD_RECONCILED', { riderId, amount }, { riderId })
  const dueIds = new Set(due.map((x) => x.order.id))
  for (const l of next.ledger.filter((e) => e.status === 'accrued' && dueIds.has(e.orderId))) {
    next = setEntry(next, l.id, { status: 'pending' })
    next = emit(next, at, 'BONUS_PENDING', { amount: l.amount }, { orderId: l.orderId, riderId: l.riderId })
  }
  return next
}

/** Pending bonuses whose return window has closed with no return are released, and booked as a cost. */
export function releaseDue(s: S, at: number): S {
  let next = s
  for (const l of s.ledger) {
    if (l.status !== 'pending' || next.simNow < l.deliveredSim + RETURN_WINDOW_MS) continue
    // A captain's silence never costs an honest rider: a held bonus nobody decided is released by default when the 7-day window ends.
    const defaulted = l.review?.state === 'waiting'
    next = setEntry(next, l.id, { status: 'released', ...(defaulted && l.review ? { review: { ...l.review, state: 'default_released' as const, decidedSim: next.simNow } } : {}) })
    next = emit(next, at, 'BONUS_RELEASED', { amount: l.amount, ...(defaulted ? { defaulted: true } : {}) }, { orderId: l.orderId, riderId: l.riderId })
    next = bookCost(next, at, 'Rescue bonus', l.amount, 'Valmo', 'bonus', l.orderId)
  }
  return next
}

/** A return was opened: inside the window the bonus (accrued or pending) is clawed back. A released one is left alone. */
export function clawBack(s: S, orderId: string, at: number): S {
  let next = s
  for (const l of s.ledger.filter((e) => e.orderId === orderId)) {
    if (l.status !== 'accrued' && l.status !== 'pending') continue
    if (s.simNow >= l.deliveredSim + RETURN_WINDOW_MS) continue
    next = setEntry(next, l.id, { status: 'clawed_back', reason: 'return opened inside the return window' })
    next = emit(next, at, 'BONUS_CLAWED_BACK', { amount: l.amount }, { orderId, riderId: l.riderId })
    next = feedAdd(next, at, 'bonus', `₹${l.amount} bonus clawed back: the customer returned the order inside the ${RETURN_WINDOW_MS / DAY_MS}-day window`, orderId)
  }
  return next
}

export interface LedgerTotals {
  readonly accrued: number
  readonly pending: number
  readonly released: number
  readonly clawedBack: number
  readonly blocked: number
  /** accrued + pending: promised to riders, not yet paid */
  readonly liability: number
}

export function ledgerTotals(s: S): LedgerTotals {
  const sum = (status: LedgerStatus): number => s.ledger.filter((l) => l.status === status).reduce((t, l) => t + l.amount, 0)
  const accrued = sum('accrued')
  const pending = sum('pending')
  return { accrued, pending, released: sum('released'), clawedBack: sum('clawed_back'), blocked: sum('blocked'), liability: accrued + pending }
}

export interface CostLine {
  readonly line: string
  readonly owner: string
  readonly stream: 'bonus' | 'common' | 'router'
  readonly amount: number
  readonly count: number
  /** True for every line except the case-pack figures */
  readonly assumption: boolean
}

/** The lines whose figure comes straight from the case data pack */
const CASE_PACK_LINES = new Set(['RTO reverse', 'Re-attempt (last-mile leg)'])

/** One line per cost, from the event log. WhatsApp messages are counted from `MSG_SENT`. Every line except the case-pack figures is an assumption. */
export function costLedger(s: S): readonly CostLine[] {
  const lines = new Map<string, CostLine>()
  for (const e of s.events) {
    if (e.type !== 'COST_BOOKED') continue
    const line = String(e.data.line)
    const cur = lines.get(line)
    lines.set(line, {
      line,
      owner: String(e.data.owner),
      stream: e.data.stream as CostLine['stream'],
      amount: (cur?.amount ?? 0) + Number(e.data.amount),
      count: (cur?.count ?? 0) + 1,
      assumption: !CASE_PACK_LINES.has(line),
    })
  }
  const messages = s.events.filter((e) => e.type === 'MSG_SENT').length
  if (messages > 0) lines.set('WhatsApp message', { line: 'WhatsApp message', owner: 'Meesho', stream: 'common', amount: messages * WHATSAPP_COST, count: messages, assumption: true })
  return [...lines.values()].sort((a, b) => (a.line < b.line ? -1 : 1))
}

export interface SavingLine {
  readonly line: string
  readonly amount: number
  readonly count: number
}

/** Savings are booked only on a real outcome (a re-home delivered, a second chance delivered, a batch closed). */
export function savingsLedger(s: S): { readonly lines: readonly SavingLine[]; readonly total: number } {
  const lines = new Map<string, SavingLine>()
  for (const e of s.events) {
    if (e.type !== 'SAVING_BOOKED') continue
    const line = String(e.data.line)
    const cur = lines.get(line)
    lines.set(line, { line, amount: (cur?.amount ?? 0) + Number(e.data.amount), count: (cur?.count ?? 0) + 1 })
  }
  const list = [...lines.values()].sort((a, b) => (a.line < b.line ? -1 : 1))
  return { lines: list, total: list.reduce((t, l) => t + l.amount, 0) }
}
