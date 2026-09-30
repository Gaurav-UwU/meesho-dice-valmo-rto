import { parcelForOrder } from '../../domain/selectors.ts'
import type { DayState, MessageButton, ReplyKind, WaMessage } from '../../domain/types.ts'
import type { ActionInput } from '../../store/types.ts'

const REPLY_KINDS: readonly string[] = ['home', 'change_time', 'fix_address', 'pay_now']

const isReplyKind = (id: string): id is ReplyKind => REPLY_KINDS.includes(id)

/** The newest message of the thread that offers buttons. Older ones are shown greyed out. */
export function latestButtonMessageId(messages: readonly WaMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const buttons = messages[i].buttons
    if (buttons && buttons.length > 0) return messages[i].id
  }
  return undefined
}

/** A button is live only on the newest button message, and only while the question is still open. */
export function isMessageLive(state: DayState, msg: WaMessage, latestId: string | undefined): boolean {
  if (msg.id !== latestId) return false
  const stop = state.stops[msg.orderId]
  if (!stop) return false
  switch (msg.kind) {
    case 'order_day':
      return stop.status === 'out_for_delivery' || stop.status === 'otp_sent' || stop.status === 'rescheduled'
    case 'attempt_check':
      return stop.status === 'ndr' && stop.answers.riderReached === null
    case 'reschedule_check':
      return stop.status === 'ndr' && stop.answers.askedReschedule === null
    case 'pay_prompt':
      return stop.paymentPending === true
    case 'second_chance':
      return parcelForOrder(state, msg.orderId)?.state === 'second_chance_sent'
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
    case 'attempt_check':
      return { type: 'customerReach', orderId, reached: button.id === 'yes' }
    case 'reschedule_check':
      return { type: 'customerAskedReschedule', orderId, asked: button.id === 'yes' }
    case 'pay_prompt':
      return { type: 'customerPayment', orderId, ok: button.id === 'pay_ok' }
    case 'second_chance': {
      const parcel = parcelForOrder(state, orderId)
      return parcel ? { type: 'customerSecondChance', parcelId: parcel.id, accept: button.id === 'accept' } : null
    }
    default:
      return null
  }
}

/** The 4-digit code inside an OTP message, so it can be shown large for the presenter to read out. */
export function otpCodeOf(msg: WaMessage): string | null {
  if (msg.kind !== 'delivery_otp' && msg.kind !== 'refusal_otp') return null
  return /\b(\d{4})\b/.exec(msg.text)?.[1] ?? null
}
