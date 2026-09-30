import { ROUTER } from '../engine/economics.ts'
import type { DayState, StopRecord } from './types.ts'

/**
 * The order lifecycle (prototype spec A). Every order is in exactly one state and ends in exactly one terminal state.
 * `otp_sent` is a sub-state of `out_for_delivery`: the rider asked for a code and is waiting for the customer to read it out.
 */
export const OPEN_STATUSES = ['scored', 'out_for_delivery', 'otp_sent', 'ndr', 'rescheduled', 'refused'] as const
export const TERMINAL_STATUSES = ['delivered_a1', 'delivered_a2', 'rehomed', 'hub_pickup', 'rto', 'cancelled'] as const

export type OpenStatus = (typeof OPEN_STATUSES)[number]
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number]
export type OrderStatus = OpenStatus | TerminalStatus

export const ORDER_STATUSES: readonly OrderStatus[] = [...OPEN_STATUSES, ...TERMINAL_STATUSES]

const TERMINAL: ReadonlySet<OrderStatus> = new Set(TERMINAL_STATUSES)

export const isTerminal = (status: OrderStatus): status is TerminalStatus => TERMINAL.has(status)
export const isOpen = (status: OrderStatus): status is OpenStatus => !TERMINAL.has(status)
export const isDelivered = (status: OrderStatus): boolean => status === 'delivered_a1' || status === 'delivered_a2'

/** An attempt was made and the order is delivered or failed as it stands (a failed order may still be retried). Not yet attempted = false. */
export const isSettled = (status: OrderStatus): boolean => isDelivered(status) || status === 'ndr' || status === 'refused' || status === 'rto' || status === 'rehomed' || status === 'hub_pickup'

/**
 * Every legal move. Anything else is rejected. A delivery is only reachable from `otp_sent`, so nothing is ever delivered without a verified OTP.
 */
export const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  scored: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['otp_sent', 'ndr', 'refused', 'rescheduled'],
  otp_sent: ['out_for_delivery', 'ndr', 'refused', 'delivered_a1', 'delivered_a2'],
  ndr: ['out_for_delivery', 'rescheduled', 'rto'],
  rescheduled: ['out_for_delivery', 'rto'],
  // A second chance can send it out again at once, or on a later day; a customer can also collect it at the hub (never a delivery).
  refused: ['out_for_delivery', 'rescheduled', 'rehomed', 'hub_pickup', 'rto'],
  delivered_a1: [],
  delivered_a2: [],
  rehomed: [],
  hub_pickup: [],
  rto: [],
  cancelled: [],
}

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => TRANSITIONS[from].includes(to)

/** The terminal state a delivery lands in, by which attempt made it. */
export const deliveredStatus = (attempt: number): 'delivered_a1' | 'delivered_a2' => (attempt <= 1 ? 'delivered_a1' : 'delivered_a2')

/** Two attempts at most, by default. Editable in the day config. */
export const MAX_ATTEMPTS = 2
/** ₹ for one more last-mile leg (case data pack). */
export const REATTEMPT_COST = ROUTER.reAttemptCost
/** ₹ of reverse leg avoided when a failed order is delivered after all (case data pack). */
export const REVERSE_LEG_COST = 120

export interface ReattemptInput {
  /** The attempt that just failed (1 = the first) */
  readonly attempt: number
  readonly maxAttempts: number
  /** Chance the next attempt delivers. An assumption; the pilot measures it. */
  readonly pSuccessNext: number
}

export interface ReattemptDecision {
  readonly reattempt: boolean
  /** Expected ₹ of trying again: P(success) x reverse leg avoided - cost of another leg */
  readonly ev: number
  readonly reason: string
}

/** Try again only if an attempt is left and the expected recovery beats its cost: P(success next) x ₹120 - ₹21 > 0. */
export function reattemptDecision(input: ReattemptInput): ReattemptDecision {
  const ev = input.pSuccessNext * REVERSE_LEG_COST - REATTEMPT_COST
  if (input.attempt >= input.maxAttempts) return { reattempt: false, ev, reason: `All ${input.maxAttempts} attempts used: goes back as an RTO` }
  if (ev <= 0) return { reattempt: false, ev, reason: `Another attempt is not worth it (expected ₹${ev.toFixed(0)}): goes back as an RTO` }
  return { reattempt: true, ev, reason: `Another attempt is worth trying (expected +₹${ev.toFixed(0)})` }
}

export interface TransitionOptions {
  readonly at: number
  readonly reason: string
  /** Extra fields set on the order when the move is accepted */
  readonly patch?: Partial<StopRecord>
}

/**
 * Move one order to a new state. A move that is not in the table changes nothing except a record in `rejectedTransitions`,
 * which the Audit screen lists.
 */
export function applyTransition(s: DayState, orderId: string, to: OrderStatus, opts: TransitionOptions): DayState {
  const st = s.stops[orderId]
  if (!st) return s
  if (!canTransition(st.status, to)) {
    return { ...s, rejectedTransitions: [...s.rejectedTransitions, { orderId, from: st.status, to, reason: opts.reason, at: opts.at }] }
  }
  return { ...s, stops: { ...s.stops, [orderId]: { ...st, ...opts.patch, status: to } } }
}
