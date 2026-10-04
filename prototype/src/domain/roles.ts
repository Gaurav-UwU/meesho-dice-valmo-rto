import type { Action } from './types.ts'

/**
 * Who may send which action in Live mode. Two keys: the RIDER key (carried by the rider and customer QR codes) and the CAPTAIN key (the team's;
 * never in a QR code). A rider key can send only what a rider's phone does, and the customer replies (still guarded to synthetic orders by the server).
 * Everything else (the captain's decisions, the Desk, the clock, the pilot) needs the captain key.
 */
export type Role = 'rider' | 'captain'

export type ActionType = Action['type']

/** What a rider's phone does. `riderCall` logs a call from the task card on the order the rider holds. `riderAskReview` is the rider asking for a review of their own strike: it only flags it, once. */
export const RIDER_ACTIONS: ReadonlySet<ActionType> = new Set<ActionType>(['riderDeliver', 'submitOtp', 'riderAttempt', 'riderCall', 'riderRefuse', 'riderAskReview'])

/** What a customer's phone does (on a real number only that customer's own WhatsApp reply may answer: the server guards it separately) */
export const CUSTOMER_ACTIONS: ReadonlySet<ActionType> = new Set<ActionType>(['customerReply', 'customerLanguage', 'customerPayment', 'customerReach', 'customerAskedReschedule', 'customerSecondChance'])

/** True when the role may send this action */
export function roleCan(role: Role, type: ActionType): boolean {
  if (role === 'captain') return true
  return RIDER_ACTIONS.has(type) || CUSTOMER_ACTIONS.has(type)
}
