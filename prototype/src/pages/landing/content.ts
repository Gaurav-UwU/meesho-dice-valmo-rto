/** Copy for the landing page: a guided walkthrough of the demo. The real/simulated table follows work/08-prototype-spec.md section 1. */

export interface DemoLink {
  readonly route: string
  readonly label: string
}

export interface DemoStep {
  readonly id: string
  readonly title: string
  /** What the person does */
  readonly doThis: string
  /** What they should see happen */
  readonly see: string
  readonly links: readonly DemoLink[]
}

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    id: 'start',
    title: 'Start the day',
    doThis: 'On the Ops console, press Start day.',
    see: 'Every order gets a Rescue Score and the riskiest 20% turn purple on the map as Bonus-Eligible. The sim clock reads Day 1 · 08:00.',
    links: [{ route: '/ops', label: 'Open Ops' }],
  },
  {
    id: 'customer',
    title: 'Answer as the customer',
    doThis: 'On the customer phone pick a flagged order and tap “I’m home”. On another one, tap “Change time”.',
    see: 'Valmo’s own “Arriving Today” WhatsApp wording, with buttons. A rescheduled order is parked for tomorrow but stays counted in its arm.',
    links: [{ route: '/customer', label: 'Open Customer' }],
  },
  {
    id: 'deliver',
    title: 'Deliver as the rider and watch ₹15 accrue',
    doThis: 'On the rider app tap Deliver, read the OTP on the customer phone and type it in.',
    see: 'The Bonus rider sees a green “+15 Bonus Eligible” chip, never a score. After the OTP the ₹15 shows as pending (COD waits for the rider’s cash). A Control rider earns nothing.',
    links: [
      { route: '/rider', label: 'Open Rider' },
      { route: '/customer', label: 'Customer (for the OTP)' },
    ],
  },
  {
    id: 'fake',
    title: 'Catch a fake attempt',
    doThis: 'On the rider app tap Attempted, press “Demo: log it from far away”, pick a reason. Then open the Hub captain screen: the attempt is in “To review”. Press Free re-attempt, or Strike… and pick a reason chip.',
    see: 'A GPS pin 900 m from the door is low confidence, so it goes to the hub captain (Ops only reads it). Another rider of the same arm takes the order and the first rider is not paid. A strike needs a reason and supporting evidence, shows on the rider app as a strike meter (in Hindi too), and Ops can overturn it within 48 h. This works with the bonus off, for Control riders too.',
    links: [
      { route: '/rider', label: 'Open Rider' },
      { route: '/captain', label: 'Open Hub captain' },
    ],
  },
  {
    id: 'refuse',
    title: 'Refuse a parcel and follow it on the Desk',
    doThis: 'On the rider app tap Refused, choose “Didn’t order it” and finish the code. On the Desk press “Record inspection”, then Hold, then “Simulate a buyer now”.',
    see: 'The Router shows the expected value of each lane and a match forecast: Hold is allowed only when the low end of the forecast clears the 5.5% break-even. The ₹145 saving is booked only when the new buyer’s order is delivered, not when it is matched.',
    links: [
      { route: '/rider', label: 'Open Rider' },
      { route: '/desk', label: 'Open Desk' },
    ],
  },
  {
    id: 'time',
    title: 'Jump forward in time',
    doThis: 'On Ops press +1 day a couple of times, then Close pilot.',
    see: 'Timers fire (second chance 24 h, hold 48 h, return window 7 days). The Bonus vs Control card gives a verdict and the ledger lists every rupee booked, with who pays.',
    links: [{ route: '/ops', label: 'Open Ops' }],
  },
  {
    id: 'audit',
    title: 'Check the numbers',
    doThis: 'Open the Audit.',
    see: 'Eighteen checks on the day’s own record, all green: one final state per order, nothing delivered without an OTP, nothing held without an inspection, no pickup without a verified code, every strike decided by the captain with a reason, the ledger equals every screen.',
    links: [{ route: '/audit', label: 'Open Audit' }],
  },
  {
    id: 'pilot',
    title: 'Ask the decision question',
    doThis: 'On the pilot page look for the ✔ Fair comparison line, tap the scenarios under “Try”, drag “How much the bonus helps” down to about +8, then switch “Who gets the bonus” to Top 10%. Under More settings, tick “Loosen the rule after seeing the result”.',
    see: 'The bar under the verdict shows how often luck alone would change the answer. When the answer is RE-PRICE, the next step is Pilot 2: change one thing (Top 10% or a smaller bonus) and fix its rule before it starts. Changing the rule afterwards makes the result unusable.',
    links: [{ route: '/pilot', label: 'Open Pilot' }],
  },
]

export const MOVES = [
  { tag: 'Now', title: 'Rescue Bonus', text: '₹15 to the rider, only when a top-20% risky order is delivered.' },
  { tag: 'Next', title: 'Refused-Parcel Router', text: 'Each refused parcel takes its cheapest legal recovery.' },
  { tag: 'Later', title: 'Pay by difficulty', text: 'Price each stop by how hard it really is.' },
] as const

export interface RealRow {
  readonly layer: string
  readonly real: string
  readonly simulated: string
}

export const REAL_VS_SIMULATED: readonly RealRow[] = [
  {
    layer: 'Numbers',
    real: 'The case data pack: 80% COD, 20% / 5% RTO, ₹50 forward, ₹120 return, and the 15 / 17 / 22% distance curve.',
    simulated: 'The case data pack plus our labelled assumptions: the ₹15 bonus, the 60% baseline, the ₹21 re-attempt, how often customers accept a second chance, and every uplift. The pilot would measure them.',
  },
  {
    layer: 'Orders and riders',
    real: 'The distributions the orders are drawn from.',
    simulated: 'Every order, rider, name and AWB is synthetic and seeded. No real customer data.',
  },
  {
    layer: 'Rescue Score',
    real: 'Transparent, rule-based, weights visible. Inputs are last-mile signals: distance, unclear address, phone reachability, past failures, COD, order value.',
    simulated: 'The TrustMesh part is a labelled stand-in, calibrated to 17% RTO overall and about 40% in the top 20%. We never claim to be TrustMesh.',
  },
  {
    layer: 'Messaging',
    real: 'Built: the order-day message, OTP, second chance, address fix and failure check. Sending is blocked by Twilio’s trial account, so no live WhatsApp is shown.',
    simulated: 'Demo mode shows it on screen: an on-screen customer phone stands in for WhatsApp so anyone can click through.',
  },
  {
    layer: 'OTP',
    real: 'The OTP rules are real code: 4 digits, 5 tries, 10-minute expiry, checked before any delivery or refusal counts. Sending it by WhatsApp is blocked by Twilio’s trial.',
    simulated: 'Demo mode shows the code on the emulated phone.',
  },
  {
    layer: 'Multi-device sync',
    real: 'Built for Live mode: laptop, rider phone and customer move together through a realtime database. The video uses Demo mode.',
    simulated: 'Demo mode syncs tabs in one browser. Autopilot bots deliver the other stops so numbers move.',
  },
  {
    layer: 'Pilot A/B',
    real: 'The decision rule is real code: riders paired on past delivery rate with a coin flip in each pair, a pair-by-pair 95% range, a fair-comparison check, two safety rules (normal orders, and Bonus riders’ fake attempts no more than 2 points above Control’s), returns and complaints watched but never a stop rule, and a rule locked at planning (INVALID if it changes).',
    simulated: 'The outcomes: the pilot has not run, so they are random draws around the uplift you set. The link from ₹15 to rider effort to a delivery is assumed, not measured.',
  },
  {
    layer: 'Fake-attempt control',
    real: 'The rules are real code: the strike log (30-day expiry), the three-step ladder, a strike that needs a reason and corroboration, the 24 h “captain did not decide” rule, Ops overturn within 48 h and the hold on a ₹15 after a weak same-rider attempt. It works with the bonus off.',
    simulated: 'The captains are synthetic names with no login, the fake share of attempts is an assumption (4%), and the ladder is our proposal: Valmo’s real rules and labour practice decide what is allowed.',
  },
  {
    layer: 'Refused-Parcel Router',
    real: 'The lane rules and the rupee effects are real code from our desk research (GST, FDI, consumer rules). It is not legal advice.',
    simulated: 'Which parcels are refused, seller opt-ins and seal checks. Lane 4 (local disposal) is not built.',
  },
]
