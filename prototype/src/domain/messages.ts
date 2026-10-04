import type { ReplyKind, MessageButton } from './types.ts'

/**
 * Customer WhatsApp copy. The first line of each "Valmo" message reuses the wording of Valmo's real messages
 * (seen on a real Meesho order, 28 Sep); the buttons and the follow-ups are our additions.
 */
export const REPLY_BUTTONS: Readonly<Record<ReplyKind, MessageButton>> = {
  home: { id: 'home', label: "✅ I'm home" },
  change_time: { id: 'change_time', label: '🕐 Change time' },
  fix_address: { id: 'fix_address', label: '📍 Fix address' },
  pay_now: { id: 'pay_now', label: '💳 Pay now (UPI)' },
}

/**
 * Days a parcel arrives before the date the customer was promised (0 = on time). Our field research (Tier 3/4) and our own test order found
 * COD parcels arriving days early, before the cash is ready. Synthetic: about a third of COD orders, 2 to 5 days early, fixed by the order id.
 */
export function daysEarly(orderId: string, isCod: boolean): number {
  if (!isCod) return 0
  let h = 7
  for (const ch of orderId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 3 === 0 ? 2 + ((h >>> 2) % 4) : 0
}

/** On an early order "Change time" becomes "Keep my promised date": same reply, a later date. */
export const KEEP_DATE_LABEL = '📅 Keep my promised date'

/** The label the customer saw for a reply (an early order shows "Keep my promised date" for change_time). */
export const replyLabel = (reply: ReplyKind, early: number): string => (reply === 'change_time' && early > 0 ? KEEP_DATE_LABEL : REPLY_BUTTONS[reply].label)

/** Pay now is offered on flagged COD orders only. An early COD order leads with UPI and the promised date. */
export function orderDayButtons(isCod: boolean, early = 0): readonly MessageButton[] {
  if (isCod && early > 0) return [REPLY_BUTTONS.home, REPLY_BUTTONS.pay_now, { id: 'change_time', label: KEEP_DATE_LABEL }, REPLY_BUTTONS.fix_address]
  return isCod
    ? [REPLY_BUTTONS.home, REPLY_BUTTONS.change_time, REPLY_BUTTONS.fix_address, REPLY_BUTTONS.pay_now]
    : [REPLY_BUTTONS.home, REPLY_BUTTONS.change_time, REPLY_BUTTONS.fix_address]
}

export const orderDayText = (awb: string, isCod: boolean, amount: number, early = 0): string =>
  isCod && early > 0
    ? `Arriving early, today : Your Meesho order with AWB ${awb} was promised in ${early} days, and it is out for delivery today.` +
      ` If the cash is not ready, pay Rs. ${amount} now by UPI, or keep your promised date:`
    : `Arriving Today : Your Meesho order with AWB ${awb} is out for delivery.` +
      (isCod ? ` Pay Rs. ${amount} via UPI by scanning the QR code on the rider app, or pay now.` : '') +
      ' Tell us how to reach you:'

export const keepDateAck = (early: number): string => `Done. We will bring it on your promised date, in ${early} days, and tell you the time.`

export const replyAck: Readonly<Record<ReplyKind, string>> = {
  home: 'Thanks! We have told your delivery agent you will be home.',
  change_time: 'No problem. We will deliver on the next available slot and tell you the new time.',
  fix_address: 'Please share your live location so the agent can find you.',
  pay_now: 'Pay securely with UPI here: upi://pay (demo). Tell us once you have paid and your order will be marked prepaid.',
}

export const PAY_BUTTONS: readonly MessageButton[] = [
  { id: 'pay_ok', label: '✅ I have paid (demo)' },
  { id: 'pay_fail', label: '❌ Payment failed (demo)' },
]

export const paymentOkAck = 'Payment received. Your order is now prepaid: just share the OTP with the delivery agent.'
export const paymentFailAck = 'The payment did not go through. No problem: you can still pay cash on delivery.'

export const addressFixedAck = 'Location received. Your delivery agent now has the exact spot.'

export const deliveryOtpText = (code: string): string =>
  `Your Meesho delivery OTP is ${code}. Share it with the delivery agent only when you receive your order.`

export const refusalOtpText = (code: string): string =>
  `Your Meesho order refusal code is ${code}. Share it with the delivery agent only if you do NOT want this order.`

export const attemptCheckText = (awb: string): string =>
  `Failed Delivery : Sorry, we failed to deliver your order with AWB ${awb}. We will try to deliver again in 24-48 Hrs - Meesho\n\nDid the delivery agent reach you (visit or call)?`

export const rescheduleCheckText = 'Did you ask to reschedule this delivery?'

export const secondChanceText = (awb: string): string =>
  `Your order ${awb} is still at our hub. What would you like to do? Choose an option:`

const SC = {
  accept: { id: 'accept', label: '🔁 Deliver again' },
  later: { id: 'later', label: '🕐 Different time' },
  pay: { id: 'pay', label: '💳 Pay now by UPI' },
  pickup: { id: 'pickup', label: '🏬 Pick up at hub' },
  decline: { id: 'decline', label: '❌ Cancel order' },
} as const

/** Deliver again and Different time always; Pay now unless the order is already prepaid; Pick up at hub only while the shelf has a free slot. */
export function secondChanceButtons(offer: { readonly pay: boolean; readonly pickup: boolean }): readonly MessageButton[] {
  return [SC.accept, SC.later, ...(offer.pay ? [SC.pay] : []), ...(offer.pickup ? [SC.pickup] : []), SC.decline]
}

export const WHEN_BUTTONS: readonly MessageButton[] = [
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'day_after', label: 'Day after tomorrow' },
]

export const whenText = 'Which day should we try again?'

export const laterAck = (day: 'tomorrow' | 'day_after'): string => `Done. We will try again ${day === 'tomorrow' ? 'tomorrow' : 'the day after tomorrow'} and tell you the time.`

export const pickupFullAck = 'Sorry, the hub shelf has just filled up, so we cannot keep it for you. We will deliver it tomorrow instead and tell you the time.'

export const pickupText = (code: string, hubName: string, hours: number): string =>
  `Your parcel is kept for you at the ${hubName} hub for ${hours} hours. Show this pickup code at the counter: ${code}. It works for 5 tries. After ${hours} hours it goes back to the seller.`

export const YES_NO: readonly MessageButton[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

export const REACH_BUTTONS: readonly MessageButton[] = [
  { id: 'yes', label: 'Yes, the agent reached me' },
  { id: 'no', label: 'No, the agent never came' },
]
