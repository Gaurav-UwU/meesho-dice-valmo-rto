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

/** Pay now is offered on flagged COD orders only. */
export function orderDayButtons(isCod: boolean): readonly MessageButton[] {
  return isCod
    ? [REPLY_BUTTONS.home, REPLY_BUTTONS.change_time, REPLY_BUTTONS.fix_address, REPLY_BUTTONS.pay_now]
    : [REPLY_BUTTONS.home, REPLY_BUTTONS.change_time, REPLY_BUTTONS.fix_address]
}

export const orderDayText = (awb: string, isCod: boolean, amount: number): string =>
  `Arriving Today : Your Meesho order with AWB ${awb} is out for delivery.` +
  (isCod ? ` Pay Rs. ${amount} via UPI by scanning the QR code on the rider app, or pay now.` : '') +
  ' Tell us how to reach you:'

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
  `Your order ${awb} is still at our hub. Would you like us to try again? Choose an option:`

export const SECOND_CHANCE_BUTTONS: readonly MessageButton[] = [
  { id: 'accept', label: '🔁 Deliver again' },
  { id: 'decline', label: '❌ Cancel order' },
]

export const YES_NO: readonly MessageButton[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

export const REACH_BUTTONS: readonly MessageButton[] = [
  { id: 'yes', label: 'Yes, the agent reached me' },
  { id: 'no', label: 'No, the agent never came' },
]
