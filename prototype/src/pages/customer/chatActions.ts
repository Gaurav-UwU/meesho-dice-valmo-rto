import { parcelForOrder } from '../../domain/selectors.ts'
import type { DayState, MessageButton, ReplyKind, SecondChanceOption, WaMessage } from '../../domain/types.ts'
import type { ActionInput } from '../../store/types.ts'

const REPLY_KINDS: readonly string[] = ['home', 'change_time', 'fix_address', 'pay_now']

/** The answers each second-chance step offers (the button id is the option) */
const STEP_OPTIONS: Readonly<Record<'second_chance' | 'second_chance_when' | 'second_chance_method' | 'second_chance_address', readonly SecondChanceOption[]>> = {
  second_chance: ['deliver', 'pickup'],
  second_chance_when: ['today', 'tomorrow', 'day_after'],
  second_chance_method: ['cod', 'upi'],
  second_chance_address: ['same_address', 'share_location'],
}

const isReplyKind = (id: string): id is ReplyKind => REPLY_KINDS.includes(id)

/**
 * The newest message of the thread that offers buttons. Older ones are shown greyed out. The language question is left out: it follows the
 * first message, and the first message's buttons must stay live under it (plan 33).
 */
export function latestButtonMessageId(messages: readonly WaMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].kind === 'language_check') continue
    const buttons = messages[i].buttons
    if (buttons && buttons.length > 0) return messages[i].id
  }
  return undefined
}

/** A button is live only on the newest button message, and only while the question is still open. */
export function isMessageLive(state: DayState, msg: WaMessage, latestId: string | undefined): boolean {
  const stop = state.stops[msg.orderId]
  if (!stop) return false
  // The language question stays live, wherever it is in the thread, until the customer has chosen.
  if (msg.kind === 'language_check') return stop.lang === undefined
  if (msg.id !== latestId) return false
  switch (msg.kind) {
    case 'order_day':
      return stop.status === 'out_for_delivery' || stop.status === 'otp_sent' || stop.status === 'rescheduled'
    case 'attempt_check':
      return stop.status === 'ndr' && stop.answers.riderReached === null
    case 'reschedule_check':
      return stop.status === 'ndr' && stop.answers.askedReschedule === null
    case 'pay_prompt':
      return stop.paymentPending === true
    case 'second_chance': {
      const parcel = parcelForOrder(state, msg.orderId)
      return parcel?.state === 'second_chance_sent' && parcel.awaiting === undefined
    }
    case 'second_chance_when':
      return parcelForOrder(state, msg.orderId)?.awaiting === 'when'
    case 'second_chance_method':
      return parcelForOrder(state, msg.orderId)?.awaiting === 'method'
    case 'second_chance_pay':
      return parcelForOrder(state, msg.orderId)?.awaiting === 'pay'
    case 'second_chance_address':
      return parcelForOrder(state, msg.orderId)?.awaiting === 'address'
    default:
      return false
  }
}

/** Which store action a tapped WhatsApp button sends (see domain/messages.ts for the ids). */
export function actionForButton(state: DayState, msg: WaMessage, button: MessageButton): ActionInput | null {
  const orderId = msg.orderId
  switch (msg.kind) {
    case 'order_day':
      return isReplyKind(button.id) ? { type: 'customerReply', orderId, reply: button.id } : null
    case 'language_check':
      return button.id === 'en' || button.id === 'hi' ? { type: 'customerLanguage', orderId, lang: button.id } : null
    case 'attempt_check':
      return { type: 'customerReach', orderId, reached: button.id === 'yes' }
    case 'reschedule_check':
      return { type: 'customerAskedReschedule', orderId, asked: button.id === 'yes' }
    case 'pay_prompt':
      return { type: 'customerPayment', orderId, ok: button.id === 'pay_ok' }
    case 'second_chance':
    case 'second_chance_when':
    case 'second_chance_method':
    case 'second_chance_address': {
      const parcel = parcelForOrder(state, orderId)
      if (!parcel) return null
      if (msg.kind === 'second_chance' && button.id === 'decline') return { type: 'customerSecondChance', parcelId: parcel.id, accept: false }
      const option = STEP_OPTIONS[msg.kind].find((o) => o === button.id)
      return option ? { type: 'customerSecondChance', parcelId: parcel.id, accept: true, option } : null
    }
    case 'second_chance_pay':
      return { type: 'customerPayment', orderId, ok: button.id === 'pay_ok' }
    default:
      return null
  }
}

/** The 4-digit code inside an OTP message, so it can be shown large for the presenter to read out. */
export function otpCodeOf(msg: WaMessage): string | null {
  if (msg.kind !== 'delivery_otp' && msg.kind !== 'refusal_otp') return null
  return /\b(\d{4})\b/.exec(msg.text)?.[1] ?? null
}
