import type { ReplyKind, MessageButton, WaLang } from './types.ts'

/**
 * Customer WhatsApp copy, in English and Hindi (plan 33). The first line of each "Valmo" message reuses the wording of Valmo's real messages
 * (seen on a real Meesho order, 28 Sep); the buttons and the follow-ups are our additions. The first message goes in both languages, the next
 * one asks which language the customer prefers, and everything after that is in their choice (English when they do not answer).
 */

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

type SecondChanceOffer = { readonly pay: boolean; readonly pickup: boolean }

export interface WaCopy {
  readonly replyButtons: Readonly<Record<ReplyKind, MessageButton>>
  readonly keepDateLabel: string
  readonly orderDayText: (awb: string, isCod: boolean, amount: number, early: number) => string
  readonly keepDateAck: (early: number) => string
  readonly replyAck: Readonly<Record<ReplyKind, string>>
  readonly payButtons: readonly MessageButton[]
  readonly paymentOkAck: string
  readonly paymentFailAck: string
  readonly addressFixedAck: string
  readonly deliveryOtpText: (code: string) => string
  readonly refusalOtpText: (code: string) => string
  readonly attemptCheckText: (awb: string) => string
  readonly reachButtons: readonly MessageButton[]
  readonly rescheduleCheckText: string
  readonly yesNo: readonly MessageButton[]
  readonly secondChanceText: (awb: string) => string
  readonly secondChanceButtons: (offer: SecondChanceOffer) => readonly MessageButton[]
  /** What the customer's tap on a second-chance or day button reads as in the chat */
  readonly secondChanceTap: Readonly<Record<'deliver' | 'later' | 'tomorrow' | 'day_after' | 'pay' | 'pickup' | 'decline', string>>
  readonly whenText: string
  readonly whenButtons: readonly MessageButton[]
  readonly laterAck: (day: 'tomorrow' | 'day_after') => string
  readonly pickupFullAck: string
  readonly pickupText: (code: string, hubName: string, hours: number) => string
  readonly languageAck: string
  /** Live mode (numbered replies): the line above the options */
  readonly replyWithNumber: string
}

/** Deliver again and Different time always; Pay now unless the order is already prepaid; Pick up at hub only while the shelf has a free slot. */
const scButtons =
  (sc: Readonly<Record<'accept' | 'later' | 'pay' | 'pickup' | 'decline', MessageButton>>) =>
  (offer: SecondChanceOffer): readonly MessageButton[] => [sc.accept, sc.later, ...(offer.pay ? [sc.pay] : []), ...(offer.pickup ? [sc.pickup] : []), sc.decline]

const EN: WaCopy = {
  replyButtons: {
    home: { id: 'home', label: "✅ I'm home" },
    change_time: { id: 'change_time', label: '🕐 Change time' },
    fix_address: { id: 'fix_address', label: '📍 Fix address' },
    pay_now: { id: 'pay_now', label: '💳 Pay now (UPI)' },
  },
  keepDateLabel: '📅 Keep my promised date',
  orderDayText: (awb, isCod, amount, early) =>
    isCod && early > 0
      ? `Arriving early, today : Your Meesho order with AWB ${awb} was promised in ${early} days, and it is out for delivery today.` +
        ` If the cash is not ready, pay Rs. ${amount} now by UPI, or keep your promised date:`
      : `Arriving Today : Your Meesho order with AWB ${awb} is out for delivery.` +
        (isCod ? ` Pay Rs. ${amount} via UPI by scanning the QR code on the rider app, or pay now.` : '') +
        ' Tell us how to reach you:',
  keepDateAck: (early) => `Done. We will bring it on your promised date, in ${early} days, and tell you the time.`,
  replyAck: {
    home: 'Thanks! We have told your delivery agent you will be home.',
    change_time: 'No problem. We will deliver on the next available slot and tell you the new time.',
    fix_address: 'Please share your live location so the agent can find you.',
    pay_now: 'Pay securely with UPI here: upi://pay (demo). Tell us once you have paid and your order will be marked prepaid.',
  },
  payButtons: [
    { id: 'pay_ok', label: '✅ I have paid (demo)' },
    { id: 'pay_fail', label: '❌ Payment failed (demo)' },
  ],
  paymentOkAck: 'Payment received. Your order is now prepaid: just share the OTP with the delivery agent.',
  paymentFailAck: 'The payment did not go through. No problem: you can still pay cash on delivery.',
  addressFixedAck: 'Location received. Your delivery agent now has the exact spot.',
  deliveryOtpText: (code) => `Your Meesho delivery OTP is ${code}. Share it with the delivery agent only when you receive your order.`,
  refusalOtpText: (code) => `Your Meesho order refusal code is ${code}. Share it with the delivery agent only if you do NOT want this order.`,
  attemptCheckText: (awb) =>
    `Failed Delivery : Sorry, we failed to deliver your order with AWB ${awb}. We will try to deliver again in 24-48 Hrs - Meesho\n\nDid the delivery agent reach you (visit or call)?`,
  reachButtons: [
    { id: 'yes', label: 'Yes, the agent reached me' },
    { id: 'no', label: 'No, the agent never came' },
  ],
  rescheduleCheckText: 'Did you ask to reschedule this delivery?',
  yesNo: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ],
  secondChanceText: (awb) => `Your order ${awb} is still at our hub. What would you like to do? Choose an option:`,
  secondChanceButtons: scButtons({
    accept: { id: 'accept', label: '🔁 Deliver again' },
    later: { id: 'later', label: '🕐 Different time' },
    pay: { id: 'pay', label: '💳 Pay now by UPI' },
    pickup: { id: 'pickup', label: '🏬 Pick up at hub' },
    decline: { id: 'decline', label: '❌ Cancel order' },
  }),
  secondChanceTap: { deliver: '🔁 Deliver again', later: '🕐 Different time', tomorrow: 'Tomorrow', day_after: 'Day after tomorrow', pay: '💳 Pay now by UPI', pickup: '🏬 Pick up at hub', decline: '❌ Cancel order' },
  whenText: 'Which day should we try again?',
  whenButtons: [
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'day_after', label: 'Day after tomorrow' },
  ],
  laterAck: (day) => `Done. We will try again ${day === 'tomorrow' ? 'tomorrow' : 'the day after tomorrow'} and tell you the time.`,
  pickupFullAck: 'Sorry, the hub shelf has just filled up, so we cannot keep it for you. We will deliver it tomorrow instead and tell you the time.',
  pickupText: (code, hubName, hours) =>
    `Your parcel is kept for you at the ${hubName} hub for ${hours} hours. Show this pickup code at the counter: ${code}. It works for 5 tries. After ${hours} hours it goes back to the seller.`,
  languageAck: 'Done. We will send your messages in English.',
  replyWithNumber: 'Reply with a number:',
}

const HI: WaCopy = {
  replyButtons: {
    home: { id: 'home', label: '✅ मैं घर पर हूँ' },
    change_time: { id: 'change_time', label: '🕐 समय बदलें' },
    fix_address: { id: 'fix_address', label: '📍 पता ठीक करें' },
    pay_now: { id: 'pay_now', label: '💳 अभी पे करें (UPI)' },
  },
  keepDateLabel: '📅 तय तारीख पर ही लाएँ',
  orderDayText: (awb, isCod, amount, early) =>
    isCod && early > 0
      ? `जल्दी पहुँच रहा है, आज : AWB ${awb} वाला आपका Meesho ऑर्डर ${early} दिन बाद आना था, पर यह आज ही डिलीवरी के लिए निकल गया है।` +
        ` अगर नकद तैयार नहीं है, तो ₹${amount} अभी UPI से पे करें, या अपनी तय तारीख रखें:`
      : `आज डिलीवरी : AWB ${awb} वाला आपका Meesho ऑर्डर डिलीवरी के लिए निकल चुका है।` +
        (isCod ? ` ₹${amount} राइडर ऐप पर QR कोड स्कैन करके UPI से दें, या अभी पे करें।` : '') +
        ' बताइए हम आप तक कैसे पहुँचें:',
  keepDateAck: (early) => `ठीक है। हम इसे आपकी तय तारीख पर, ${early} दिन बाद, लाएँगे और समय बताएँगे।`,
  replyAck: {
    home: 'धन्यवाद! हमने डिलीवरी एजेंट को बता दिया है कि आप घर पर रहेंगे।',
    change_time: 'कोई बात नहीं। हम अगले खाली स्लॉट में डिलीवर करेंगे और नया समय बताएँगे।',
    fix_address: 'कृपया अपनी लाइव लोकेशन भेजें, ताकि एजेंट आप तक पहुँच सके।',
    pay_now: 'यहाँ UPI से सुरक्षित पे करें: upi://pay (डेमो)। पे करने के बाद हमें बताइए, आपका ऑर्डर प्रीपेड हो जाएगा।',
  },
  payButtons: [
    { id: 'pay_ok', label: '✅ मैंने पे कर दिया (डेमो)' },
    { id: 'pay_fail', label: '❌ पेमेंट नहीं हुआ (डेमो)' },
  ],
  paymentOkAck: 'पेमेंट मिल गया। आपका ऑर्डर अब प्रीपेड है: बस डिलीवरी एजेंट को OTP बताइए।',
  paymentFailAck: 'पेमेंट नहीं हो पाया। कोई बात नहीं: आप डिलीवरी पर नकद दे सकते हैं।',
  addressFixedAck: 'लोकेशन मिल गई। आपके डिलीवरी एजेंट के पास अब सही जगह है।',
  deliveryOtpText: (code) => `आपका Meesho डिलीवरी OTP ${code} है। ऑर्डर मिलने पर ही इसे डिलीवरी एजेंट को बताइए।`,
  refusalOtpText: (code) => `आपका Meesho ऑर्डर लौटाने का कोड ${code} है। यह कोड डिलीवरी एजेंट को तभी बताइए जब आपको यह ऑर्डर नहीं चाहिए।`,
  attemptCheckText: (awb) =>
    `डिलीवरी नहीं हो पाई : माफ़ कीजिए, AWB ${awb} वाला आपका ऑर्डर डिलीवर नहीं हो सका। हम 24-48 घंटे में फिर कोशिश करेंगे - Meesho\n\nक्या डिलीवरी एजेंट आप तक पहुँचा (घर आया या कॉल किया)?`,
  reachButtons: [
    { id: 'yes', label: 'हाँ, एजेंट मुझ तक पहुँचा' },
    { id: 'no', label: 'नहीं, एजेंट आया ही नहीं' },
  ],
  rescheduleCheckText: 'क्या आपने यह डिलीवरी किसी और समय करने को कहा था?',
  yesNo: [
    { id: 'yes', label: 'हाँ' },
    { id: 'no', label: 'नहीं' },
  ],
  secondChanceText: (awb) => `आपका ऑर्डर ${awb} अभी हमारे हब पर है। आप क्या करना चाहेंगे? एक विकल्प चुनें:`,
  secondChanceButtons: scButtons({
    accept: { id: 'accept', label: '🔁 फिर से डिलीवर करें' },
    later: { id: 'later', label: '🕐 कोई और समय' },
    pay: { id: 'pay', label: '💳 अभी UPI से पे करें' },
    pickup: { id: 'pickup', label: '🏬 हब से ले जाऊँगा' },
    decline: { id: 'decline', label: '❌ ऑर्डर रद्द करें' },
  }),
  secondChanceTap: { deliver: '🔁 फिर से डिलीवर करें', later: '🕐 कोई और समय', tomorrow: 'कल', day_after: 'परसों', pay: '💳 अभी UPI से पे करें', pickup: '🏬 हब से ले जाऊँगा', decline: '❌ ऑर्डर रद्द करें' },
  whenText: 'हम किस दिन फिर कोशिश करें?',
  whenButtons: [
    { id: 'tomorrow', label: 'कल' },
    { id: 'day_after', label: 'परसों' },
  ],
  laterAck: (day) => `ठीक है। हम ${day === 'tomorrow' ? 'कल' : 'परसों'} फिर कोशिश करेंगे और समय बताएँगे।`,
  pickupFullAck: 'माफ़ कीजिए, हब की शेल्फ़ अभी भर गई है, इसलिए हम इसे आपके लिए रख नहीं सकते। हम इसे कल डिलीवर करेंगे और समय बताएँगे।',
  pickupText: (code, hubName, hours) =>
    `आपका पार्सल ${hubName} हब पर ${hours} घंटे के लिए आपके लिए रखा है। काउंटर पर यह पिकअप कोड दिखाइए: ${code}। यह 5 बार तक काम करेगा। ${hours} घंटे बाद यह सेलर को वापस चला जाएगा।`,
  languageAck: 'ठीक है, आगे के संदेश हिंदी में भेजेंगे।',
  replyWithNumber: 'नंबर लिखकर जवाब दें:',
}

export const WA_COPY: Readonly<Record<WaLang, WaCopy>> = { en: EN, hi: HI }

/** The copy for a customer: their choice, or English when they have not chosen (only the first message is in both languages). */
export const waCopy = (lang: WaLang | undefined): WaCopy => WA_COPY[lang ?? 'en']

/** The first message, in both languages: English, then Hindi. */
export const orderDayTextBoth = (awb: string, isCod: boolean, amount: number, early = 0): string =>
  `${EN.orderDayText(awb, isCod, amount, early)}\n\n${HI.orderDayText(awb, isCod, amount, early)}`

const both = (en: MessageButton, hi: MessageButton): MessageButton => ({ id: en.id, label: `${en.label} · ${hi.label.replace(/^\S+\s/, '')}` })

/** On an early order "Change time" becomes "Keep my promised date": same reply, a later date. */
export const KEEP_DATE_LABEL = `${EN.keepDateLabel} · ${HI.keepDateLabel.replace(/^\S+\s/, '')}`

/** The first message's buttons, in both languages ("✅ I'm home · मैं घर पर हूँ") */
const BOTH: Readonly<Record<ReplyKind, MessageButton>> = {
  home: both(EN.replyButtons.home, HI.replyButtons.home),
  change_time: both(EN.replyButtons.change_time, HI.replyButtons.change_time),
  fix_address: both(EN.replyButtons.fix_address, HI.replyButtons.fix_address),
  pay_now: both(EN.replyButtons.pay_now, HI.replyButtons.pay_now),
}

/** The label the customer saw for a reply on the first message (an early order shows "Keep my promised date" for change_time). */
export const replyLabel = (reply: ReplyKind, early: number): string => (reply === 'change_time' && early > 0 ? KEEP_DATE_LABEL : BOTH[reply].label)

/** Pay now is offered on flagged COD orders only. An early COD order leads with UPI and the promised date. Labels in both languages. */
export function orderDayButtons(isCod: boolean, early = 0): readonly MessageButton[] {
  if (isCod && early > 0) return [BOTH.home, BOTH.pay_now, { id: 'change_time', label: KEEP_DATE_LABEL }, BOTH.fix_address]
  return isCod ? [BOTH.home, BOTH.change_time, BOTH.fix_address, BOTH.pay_now] : [BOTH.home, BOTH.change_time, BOTH.fix_address]
}

/** The question that follows the first message, in both languages. The customer answers with a button (Demo) or a word (Live). */
export const LANGUAGE_TEXT = 'Which language should we use for your messages?\nआगे के संदेश किस भाषा में भेजें?'
export const LANGUAGE_BUTTONS: readonly MessageButton[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
]

// The English copy under its old names (the rest of the app and older tests read these).
export const REPLY_BUTTONS = EN.replyButtons
export const orderDayText = (awb: string, isCod: boolean, amount: number, early = 0): string => EN.orderDayText(awb, isCod, amount, early)
export const keepDateAck = EN.keepDateAck
export const replyAck = EN.replyAck
export const PAY_BUTTONS = EN.payButtons
export const paymentOkAck = EN.paymentOkAck
export const paymentFailAck = EN.paymentFailAck
export const addressFixedAck = EN.addressFixedAck
export const deliveryOtpText = EN.deliveryOtpText
export const refusalOtpText = EN.refusalOtpText
export const attemptCheckText = EN.attemptCheckText
export const rescheduleCheckText = EN.rescheduleCheckText
export const secondChanceText = EN.secondChanceText
export const secondChanceButtons = EN.secondChanceButtons
export const WHEN_BUTTONS = EN.whenButtons
export const whenText = EN.whenText
export const laterAck = EN.laterAck
export const pickupFullAck = EN.pickupFullAck
export const pickupText = EN.pickupText
export const YES_NO = EN.yesNo
export const REACH_BUTTONS = EN.reachButtons
