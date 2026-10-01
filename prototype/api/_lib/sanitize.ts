import type { DayState, WaMessage } from '../../src/domain/types.ts'
import { hashOtp, isPlainOtp } from './otp.ts'

const MASK = '••••'

/** OTP and pickup-code messages keep their wording but lose the code, so the public state never reveals it. */
export function redactMessage(m: WaMessage, maskOnlyFor?: ReadonlySet<string>): WaMessage {
  if (m.kind !== 'delivery_otp' && m.kind !== 'refusal_otp' && m.kind !== 'pickup_code') return m
  if (maskOnlyFor && !maskOnlyFor.has(m.orderId)) return m
  return { ...m, text: m.text.replace(/\b\d{4}\b/g, MASK) }
}

/**
 * The version of the day that is safe to store and to publish to browsers:
 * plain OTP codes become peppered hashes and OTP messages are masked.
 * The plain codes exist only in memory while an action is being applied, and on the customer's own WhatsApp.
 *
 * `maskOnlyFor` lists the orders tied to a REAL WhatsApp number. Given, only those orders' OTP messages are masked: a synthetic
 * customer is played by the in-app phone (Customer screen, on any device), and that phone has to be able to show the code.
 * Left out, every OTP message is masked. Stored codes (`otps`) are always hashed, so a rider's screen still cannot read them.
 */
const coarse = (x: number): number => Math.round(x * 100) / 100

/**
 * An order tied to a real WhatsApp number carries that customer's own spot once they share it. The stored day is readable by anyone, so its pin
 * is rounded to about 1 km (the exact point is only needed once, to score the order, and is not kept).
 */
function coarsePins(state: DayState, bound: ReadonlySet<string>): DayState['stops'] {
  return Object.fromEntries(
    Object.entries(state.stops).map(([id, st]) => [
      id,
      bound.has(id) && st.location !== undefined
        ? { ...st, order: { ...st.order, lat: coarse(st.order.lat), lng: coarse(st.order.lng) }, location: { lat: coarse(st.location.lat), lng: coarse(st.location.lng) } }
        : st,
    ]),
  )
}

export function toStorable(state: DayState, pepper: string, maskOnlyFor?: ReadonlySet<string>): DayState {
  const otps = Object.fromEntries(
    Object.entries(state.otps).map(([orderId, otp]) => [orderId, isPlainOtp(otp.code) ? { ...otp, code: hashOtp(pepper, orderId, otp.code) } : otp]),
  )
  // A pickup code is stored like an OTP: a peppered hash, bound to the parcel.
  const parcels = state.parcels.map((p) => (p.pickup && isPlainOtp(p.pickup.code) ? { ...p, pickup: { ...p.pickup, code: hashOtp(pepper, p.id, p.pickup.code) } } : p))
  const stops = maskOnlyFor ? coarsePins(state, maskOnlyFor) : state.stops
  return { ...state, otps, parcels, stops, messages: state.messages.map((m) => redactMessage(m, maskOnlyFor)) }
}
