import type { DayState, WaMessage } from '../../src/domain/types.ts'
import { hashOtp, isPlainOtp } from './otp.ts'

const MASK = '••••'

/** OTP messages keep their wording but lose the code, so the public state never reveals it. */
export function redactMessage(m: WaMessage, maskOnlyFor?: ReadonlySet<string>): WaMessage {
  if (m.kind !== 'delivery_otp' && m.kind !== 'refusal_otp') return m
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
export function toStorable(state: DayState, pepper: string, maskOnlyFor?: ReadonlySet<string>): DayState {
  const otps = Object.fromEntries(
    Object.entries(state.otps).map(([orderId, otp]) => [orderId, isPlainOtp(otp.code) ? { ...otp, code: hashOtp(pepper, orderId, otp.code) } : otp]),
  )
  return { ...state, otps, messages: state.messages.map((m) => redactMessage(m, maskOnlyFor)) }
}
