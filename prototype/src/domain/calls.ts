import { emit } from './events.ts'
import { feedAdd, patchStop, riderName, type S } from './helpers.ts'
import type { Action, CallEntry } from './types.ts'

/**
 * Calls from the rider's task card (plan 32 B). The call goes through Valmo's masked number (demo: no real call, no phone number anywhere),
 * and the app logs it. A failed attempt's call count is what the app logged since the order last went out for delivery, so a rider can no
 * longer type a number: the same kind of call record the INSEAD study's courier used to flag fake remarks.
 */

/** The order is out with its rider (on the way, or at the door waiting for an OTP) */
const callable = (status: string): boolean => status === 'out_for_delivery' || status === 'otp_sent'

/** The calls the app logged on this order since it last went out for delivery (the ones that back up an attempt made now), oldest first */
export function callsSinceDispatch(s: S, orderId: string): readonly CallEntry[] {
  const log = s.stops[orderId]?.callLog ?? []
  if (log.length === 0) return log
  // Walk back to the last dispatch, counting this order's calls on the way: those are the calls of this run.
  let n = 0
  for (let i = s.events.length - 1; i >= 0; i--) {
    const e = s.events[i]
    if (e.orderId !== orderId) continue
    if (e.type === 'ORDER_DISPATCHED') break
    if (e.type === 'CALL_LOGGED') n++
  }
  return log.slice(Math.max(0, log.length - n))
}

/** HH:MM of a sim time, for "last call 10:42" */
export const simHm = (simAt: number): string => {
  const inDay = ((simAt % 86_400_000) + 86_400_000) % 86_400_000
  return `${String(Math.floor(inDay / 3_600_000)).padStart(2, '0')}:${String(Math.floor((inDay % 3_600_000) / 60_000)).padStart(2, '0')}`
}

export function riderCall(s: S, a: Extract<Action, { type: 'riderCall' }>): S {
  const st = s.stops[a.orderId]
  if (!s.started || !st || !callable(st.status)) return s
  const entry: CallEntry = { simAt: s.simNow, answered: a.answered, riderId: st.riderId }
  let next = patchStop(s, a.orderId, { callLog: [...(st.callLog ?? []), entry] })
  next = emit(next, a.at, 'CALL_LOGGED', { answered: a.answered }, { orderId: a.orderId, riderId: st.riderId })
  // The live demo's calls go in the feed; the bots' calls would only crowd it out (they stay in the event log and on the order).
  if (!st.manual) return next
  return feedAdd(next, a.at, 'attempt', `${riderName(s, st.riderId)} called the customer for ${st.order.awb}: ${a.answered ? 'answered' : 'no answer'}`, a.orderId)
}
