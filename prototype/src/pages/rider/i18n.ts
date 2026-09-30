export type Lang = 'en' | 'hi'

const EN = {
  title: "Today's Tasks",
  earnings: "Today's earnings",
  bonusPending: 'Rescue Bonus (pending until the return window closes)',
  onHold: 'on hold',
  pending: 'Pending',
  failed: 'Failed',
  completed: 'Completed',
  delivery: 'Delivery',
  pickup: 'Pickup',
  priority: 'Priority',
  item: '1 Item',
  prepaid: 'Prepaid',
  bonusChip: 'Bonus Eligible',
  direction: 'Direction',
  deliver: 'Deliver',
  attempted: 'Attempted',
  refused: 'Refused',
  enterCode: 'Enter code',
  landmark: 'Landmark',
  stop: 'Stop',
  otpSent: 'OTP sent',
  noTasks: 'No tasks yet. The ops team has not started the day.',
  emptyTab: 'Nothing here yet.',
  switchRider: 'Change rider',
} as const

export type StringKey = keyof typeof EN

const HI: Readonly<Record<StringKey, string>> = {
  title: 'आज के कार्य',
  earnings: 'आज की कमाई',
  bonusPending: 'रेस्क्यू बोनस (रिटर्न विंडो बंद होने तक लंबित)',
  onHold: 'रोका गया',
  pending: 'लंबित',
  failed: 'असफल',
  completed: 'पूर्ण',
  delivery: 'डिलीवरी',
  pickup: 'पिकअप',
  priority: 'प्राथमिकता',
  item: '1 आइटम',
  prepaid: 'प्रीपेड',
  bonusChip: 'बोनस योग्य',
  direction: 'दिशा',
  deliver: 'डिलीवर',
  attempted: 'प्रयास किया',
  refused: 'मना किया',
  enterCode: 'कोड डालें',
  landmark: 'लैंडमार्क',
  stop: 'स्टॉप',
  otpSent: 'OTP भेजा गया',
  noTasks: 'अभी कोई कार्य नहीं। ऑप्स टीम ने दिन शुरू नहीं किया है।',
  emptyTab: 'यहाँ अभी कुछ नहीं।',
  switchRider: 'राइडर बदलें',
}

const DICTS: Readonly<Record<Lang, Readonly<Record<StringKey, string>>>> = { en: EN, hi: HI }

export type Translate = (key: StringKey) => string

export const translator =
  (lang: Lang): Translate =>
  (key) =>
    DICTS[lang][key]
