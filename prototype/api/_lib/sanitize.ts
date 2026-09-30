import type { DayState, WaMessage } from '../../src/domain/types.ts'
import { hashOtp, isPlainOtp } from './otp.ts'

const MASK = '••••'

/** OTP messages keep their wording but lose the code, so the public state never reveals it. */
export function redactMessage(m: WaMessage): WaMessage {
  if (m.kind !== 'delivery_otp' && m.kind !== 'refusal_otp') return m
  return { ...m, text: m.text.replace(/\b\d{4}\b/g, MASK) }
}

/**
 * The version of the day that is safe to store and to publish to browsers:
 * plain OTP codes become peppered hashes and OTP messages are masked.
 * The plain codes exist only in memory while an action is being applied, and on the customer's own WhatsApp.
 */
export function toStorable(state: DayState, pepper: string): DayState {
  const otps = Object.fromEntries(
    Object.entries(state.otps).map(([orderId, otp]) => [orderId, isPlainOtp(otp.code) ? { ...otp, code: hashOtp(pepper, orderId, otp.code) } : otp]),
  )
  return { ...state, otps, messages: state.messages.map(redactMessage) }
}
