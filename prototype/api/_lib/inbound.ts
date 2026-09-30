import type { WaMessage } from '../../src/domain/types.ts'
import type { LatLng } from '../../src/engine/geo.ts'
import type { ActionInput } from '../../src/store/types.ts'

/**
 * The Twilio sandbox cannot send tappable buttons without approved templates, so Live mode sends numbered options
 * ("Reply 1, 2, 3...") and reads the reply number back. The customer panel in Demo mode renders the same options as real buttons.
 */
export function formatOutbound(m: WaMessage): string {
  if (!m.buttons || m.buttons.length === 0) return m.text
  const options = m.buttons.map((b, i) => `${i + 1}  ${b.label}`).join('\n')
  return `${m.text}\n\nReply with a number:\n${options}`
}

/** The second-chance offer's button ids and the option each one stands for. The id decides, never the position: a pickup is left out when the shelf is full. */
const SECOND_CHANCE_IDS: Readonly<Record<string, 'deliver' | 'later' | 'pay' | 'pickup'>> = { accept: 'deliver', later: 'later', pay: 'pay', pickup: 'pickup' }

const WORD_TO_INDEX: Readonly<Record<string, number>> = { yes: 0, y: 0, haan: 0, no: 1, n: 1, nahi: 1 }

/** Which button (by index) did the customer pick? Accepts "2", "2.", "Option 2" and, for two-button questions, yes/no. */
export function pickedIndex(text: string, count: number): number | null {
  const t = text.trim().toLowerCase().replace(/[.!]+$/, '')
  const num = /^(?:option\s*)?(\d)$/.exec(t)
  if (num) {
    const i = Number(num[1]) - 1
    return i >= 0 && i < count ? i : null
  }
  if (count === 2 && t in WORD_TO_INDEX) return WORD_TO_INDEX[t]
  return null
}

export interface InboundContext {
  readonly orderId: string
  /** The latest outbound message that offered options to this customer */
  readonly lastOffer: WaMessage | undefined
  readonly parcelId: string | undefined
}

/** Turn a WhatsApp reply (a number, or a shared location) into the action it stands for. null = we could not understand it. */
export function actionFromReply(ctx: InboundContext, body: string, location?: LatLng): ActionInput | null {
  const { orderId, lastOffer, parcelId } = ctx
  if (location) return { type: 'customerReply', orderId, reply: 'fix_address', location }
  if (!lastOffer?.buttons) return null
  const i = pickedIndex(body, lastOffer.buttons.length)
  if (i === null) return null
  const id = lastOffer.buttons[i].id
  switch (lastOffer.kind) {
    case 'order_day':
      return id === 'home' || id === 'change_time' || id === 'fix_address' || id === 'pay_now' ? { type: 'customerReply', orderId, reply: id } : null
    case 'attempt_check':
      return { type: 'customerReach', orderId, reached: id === 'yes' }
    case 'reschedule_check':
      return { type: 'customerAskedReschedule', orderId, asked: id === 'yes' }
    case 'pay_prompt':
      return { type: 'customerPayment', orderId, ok: id === 'pay_ok' }
    case 'second_chance': {
      if (!parcelId) return null
      const option = SECOND_CHANCE_IDS[id]
      if (id === 'decline') return { type: 'customerSecondChance', parcelId, accept: false }
      return option ? { type: 'customerSecondChance', parcelId, accept: true, option } : null
    }
    case 'second_chance_when':
      return parcelId && (id === 'tomorrow' || id === 'day_after') ? { type: 'customerSecondChance', parcelId, accept: true, option: id } : null
    case 'second_chance_pay':
      return id === 'pay_ok' || id === 'pay_fail' ? { type: 'customerPayment', orderId, ok: id === 'pay_ok' } : null
    default:
      return null
  }
}
