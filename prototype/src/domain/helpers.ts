import { emit, type EventData, type EventRef, type EventType } from './events.ts'
import { applyTransition, canTransition, isTerminal, type OrderStatus, type TransitionOptions } from './lifecycle.ts'
import type { DayState, FeedKind, ParcelRecord, StopRecord, WaMessage } from './types.ts'

/** Small pure state helpers shared by the reducer and its parts (ledger, router, exceptions, timers). */
export type S = DayState

export const FEED_LIMIT = 300
/** How many proactive WhatsApp messages one order may get. OTPs and replies to a customer's own tap do not count. */
export const CONTACT_CAP = 4
/** ₹ per WhatsApp message (assumption, Meesho pays) */
export const WHATSAPP_COST = 0.5

export const feedAdd = (s: S, at: number, kind: FeedKind, text: string, orderId?: string): S => ({
  ...s,
  feed: [...s.feed, { id: `f${s.nextId}`, at, kind, text, orderId }].slice(-FEED_LIMIT),
  nextId: s.nextId + 1,
})

export const patchStop = (s: S, id: string, patch: Partial<StopRecord>): S => ({ ...s, stops: { ...s.stops, [id]: { ...s.stops[id], ...patch } } })

export const patchParcel = (s: S, id: string, patch: Partial<ParcelRecord>): S => ({
  ...s,
  parcels: s.parcels.map((p) => (p.id === id ? { ...p, ...patch } : p)),
})

export const riderName = (s: S, riderId: string): string => s.riders.find((r) => r.id === riderId)?.name ?? riderId

/** Add a WhatsApp message and log it. Outbound messages are `MSG_SENT` events (each costs ₹0.50, derived in the cost ledger). */
export function msgAdd(s: S, m: Omit<WaMessage, 'id' | 'simAt'>): S {
  const next: S = { ...s, messages: [...s.messages, { ...m, id: `m${s.nextId}`, simAt: s.simNow }], nextId: s.nextId + 1 }
  return m.direction === 'out' ? emit(next, m.at, 'MSG_SENT', { template: m.kind }, { orderId: m.orderId }) : next
}

export const tap = (s: S, at: number, orderId: string, label: string): S => msgAdd(s, { orderId, at, direction: 'in', kind: 'customer_tap', text: label })

const PROACTIVE = new Set<WaMessage['kind']>(['order_day', 'attempt_check', 'reschedule_check', 'second_chance', 'pay_prompt'])

export const proactiveCount = (s: S, orderId: string): number => s.messages.filter((m) => m.orderId === orderId && m.direction === 'out' && PROACTIVE.has(m.kind)).length

/** Send a proactive message unless the order has reached its contact cap: then it is rejected and logged (`MSG_REJECTED`). */
export function sendProactive(s: S, m: Omit<WaMessage, 'id' | 'simAt'>): S {
  if (proactiveCount(s, m.orderId) >= CONTACT_CAP) return emit(s, m.at, 'MSG_REJECTED', { template: m.kind }, { orderId: m.orderId })
  return msgAdd(s, m)
}

export const emitOrder = (s: S, at: number, type: EventType, orderId: string, data: EventData = {}, ref: EventRef = {}): S => emit(s, at, type, data, { orderId, ...ref })

export function bookCost(s: S, at: number, line: string, amount: number, owner: string, stream: 'bonus' | 'common' | 'router', orderId?: string): S {
  return emit(s, at, 'COST_BOOKED', { line, amount, owner, stream }, orderId ? { orderId } : {})
}

export function bookSaving(s: S, at: number, line: string, amount: number, orderId?: string): S {
  return emit(s, at, 'SAVING_BOOKED', { line, amount }, orderId ? { orderId } : {})
}

export const REVERSE_COST = 120
/** Batched returns cost 30% less than a lone return (assumption; benchmark 20-40%) */
export const BATCHED_RETURN_SHARE = 0.7
export const REATTEMPT_LEG_COST = 21

export interface MoveOptions extends TransitionOptions {
  /** The order goes back inside a consolidated return: the reverse leg costs less */
  readonly batched?: boolean
}

/**
 * Move an order along the lifecycle and log what that means: a rejected move leaves a `TRANSITION_REJECTED` event, a dispatch an
 * `ORDER_DISPATCHED`, a terminal state an `ORDER_TERMINAL` (and, for an RTO, the reverse leg's cost with its owner).
 */
export function moveOrder(s: S, orderId: string, to: OrderStatus, opts: MoveOptions): S {
  const st = s.stops[orderId]
  if (!st) return s
  const from = st.status
  if (!canTransition(from, to)) {
    return emit(applyTransition(s, orderId, to, opts), opts.at, 'TRANSITION_REJECTED', { from, to }, { orderId })
  }
  let next = applyTransition(s, orderId, to, opts)
  const now = next.stops[orderId]
  if (to === 'out_for_delivery' && from !== 'otp_sent') {
    next = emit(next, opts.at, 'ORDER_DISPATCHED', { riderId: now.riderId, arm: now.arm ?? 'none', attempt: now.failedAttempts + 1 }, { orderId, riderId: now.riderId })
  }
  if (isTerminal(to)) {
    next = emit(next, opts.at, 'ORDER_TERMINAL', { status: to }, { orderId })
    if (to === 'rto') next = bookCost(next, opts.at, 'RTO reverse', opts.batched ? REVERSE_COST * BATCHED_RETURN_SHARE : REVERSE_COST, 'Valmo', 'common', orderId)
  }
  return next
}

