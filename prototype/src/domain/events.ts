import type { Arm } from '../engine/types.ts'
import type { DayState } from './types.ts'

/**
 * The append-only event log (prototype spec B). Every step the day takes leaves a typed event, so Ops, the pilot, the ledger and the Audit
 * screen can be checked against one record. `emit` throws on an unknown type or a missing required field, so a typo fails loudly in tests.
 */
export const EVENT_FIELDS = {
  // Setup
  DAY_PLANNED: ['ruleHash', 'config'],
  RULE_CHANGED: ['newHash'],
  CLOCK_ADVANCED: ['from', 'to'],
  // Order
  ORDER_SCORED: ['score', 'flagged'],
  ORDER_DISPATCHED: ['riderId', 'arm', 'attempt'],
  ORDER_TERMINAL: ['status'],
  TRANSITION_REJECTED: ['from', 'to'],
  // Customer
  MSG_SENT: ['template'],
  MSG_REJECTED: ['template'],
  CUSTOMER_REPLIED: ['reply'],
  NO_REPLY_TIMEOUT: [],
  PAYMENT_ATTEMPTED: ['ok'],
  // Delivery
  OTP_REQUESTED: ['purpose'],
  OTP_VERIFIED: ['purpose'],
  OTP_FAILED: [],
  DELIVERED: ['attempt'],
  RESCHEDULED: ['toSimAt'],
  REFUSED: ['reason'],
  // Evidence
  ATTEMPT_LOGGED: ['reason', 'gpsDistM', 'calls', 'waitMin', 'confidence'],
  ATTEMPT_CHECK_ANSWERED: ['reached'],
  EXCEPTION_OPENED: ['confidence'],
  EXCEPTION_RESOLVED: ['action', 'auto'],
  STRIKE: ['riderId'],
  // Router
  ROUTER_LANE: ['lane', 'ev', 'inputs'],
  SECOND_CHANCE_SENT: [],
  SECOND_CHANCE_ACCEPTED: [],
  SECOND_CHANCE_EXPIRED: [],
  HELD: [],
  MATCHED: ['newOrderId'],
  HOLD_EXPIRED: [],
  REHOME_DELIVERED: [],
  REHOME_FAILED: [],
  BATCHED: ['batchId'],
  // Money
  BONUS_ACCRUED: ['amount'],
  BONUS_PENDING: ['amount'],
  BONUS_RELEASED: ['amount'],
  BONUS_CLAWED_BACK: ['amount'],
  BONUS_BLOCKED: ['amount'],
  COD_RECONCILED: ['riderId', 'amount'],
  RETURN_OPENED: [],
  COST_BOOKED: ['line', 'amount', 'owner', 'stream'],
  SAVING_BOOKED: ['line', 'amount'],
} as const satisfies Record<string, readonly string[]>

export type EventType = keyof typeof EVENT_FIELDS

export type EventData = Readonly<Record<string, unknown>>

export interface DomainEvent {
  /** 1, 2, 3... in the order things happened */
  readonly seq: number
  /** Simulated time */
  readonly simAt: number
  /** Wall-clock time of the action that caused it */
  readonly wallAt: number
  readonly type: EventType
  readonly orderId?: string
  readonly riderId?: string
  readonly arm?: Arm
  readonly data: EventData
}

export interface EventRef {
  readonly orderId?: string
  readonly riderId?: string
  readonly arm?: Arm
}

const isEventType = (t: string): t is EventType => Object.prototype.hasOwnProperty.call(EVENT_FIELDS, t)

/** Append one event. Returns a new state; the old one is untouched. */
export function emit(s: DayState, at: number, type: EventType, data: EventData = {}, ref: EventRef = {}): DayState {
  if (!isEventType(type)) throw new Error(`Unknown event type: ${String(type)}`)
  for (const field of EVENT_FIELDS[type] as readonly string[]) {
    if (!(field in data)) throw new Error(`Event ${type} is missing required field "${field}"`)
  }
  const arm = ref.arm ?? (ref.orderId ? s.stops[ref.orderId]?.arm : undefined)
  const event: DomainEvent = {
    seq: s.events.length + 1,
    simAt: s.simNow,
    wallAt: at,
    type,
    ...(ref.orderId === undefined ? {} : { orderId: ref.orderId }),
    ...(ref.riderId === undefined ? {} : { riderId: ref.riderId }),
    ...(arm === undefined ? {} : { arm }),
    data,
  }
  return { ...s, events: [...s.events, event] }
}

export function eventsOf(s: DayState, type: EventType, orderId?: string): readonly DomainEvent[] {
  return s.events.filter((e) => e.type === type && (orderId === undefined || e.orderId === orderId))
}
