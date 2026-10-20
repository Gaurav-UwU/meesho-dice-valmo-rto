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
    doThis: 'On the customer phone pick a flagged order, tap हिंदी (or English) under the first message, then tap “I’m home”. On another one, tap “Change time”.',
    see: 'Valmo’s own “Arriving Today” WhatsApp wording, with buttons, in English and Hindi; the next message asks which language to use from now on. A rescheduled order is parked for tomorrow but stays counted in its arm.',
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
    see: 'A GPS pin 900 m from the door is low confidence, so it goes to the hub captain (Ops only reads it). The same rider tries again (they know the area): a free re-attempt holds their ₹15 for the captain, and a strike loses that order’s ₹15 for good. A strike needs a reason and supporting evidence, shows on the rider app as a strike meter (in Hindi too), and Ops can overturn it within 48 h. This works with the bonus off, for Control riders too.',
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
    see: 'Nineteen checks on the day’s own record, all green. Each order has one final state, nothing is delivered without an OTP or held without an inspection, no pickup happens without a verified code, every strike has the captain’s reason, every attempt’s call count matches the calls the app logged, and the ledger equals every screen.',
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

/** The hero follows the final deck (slide 2: diagnose, rescue, prove, recover; long game on slide 11). */
export const HERO = {
  title: 'Cut RTO at the last mile',
  titleSpan: 'and prove it pays',
  pitch:
    'Seven in ten failed orders could still have been delivered, because the customer wasn’t ready or the parcel never properly reached the door. This six-minute demo plays one hub day with our fixes: a ₹15 bonus for delivering the riskiest 20% of orders, a hub captain who checks every suspect attempt, two-way WhatsApp for the customer, and a router for parcels that are still refused. A 90-day pilot on paired riders decides whether the bonus is worth scaling.',
  flow: [
    { label: 'The riskiest orders are flagged', note: 'top 20% by Rescue Score; the rider sees only the bonus label' },
    { label: 'The rider earns ₹15 for delivering one', note: 'paid on any attempt, confirmed with an OTP' },
    { label: 'Every failed attempt leaves a record', note: 'GPS distance, calls and waiting time; the hub captain decides the suspect ones' },
    { label: 'The customer answers on WhatsApp', note: 'I’m home, pay by UPI, change the time or fix the address' },
    { label: 'A refused parcel takes the cheapest way back', note: 'second chance, a nearby buyer, or a grouped return' },
    { label: 'A paired pilot decides', note: 'GO, RE-PRICE or KILL; it scales only if each rescue costs under ₹120' },
  ],
} as const

export const MOVES = [
  {
    tag: 'Now',
    title: 'The 90-day pilot',
    text: '₹15 Rescue Bonus, attempt verification and two-way WhatsApp on 24 matched rider pairs. If the bonus is stopped, verification and WhatsApp keep running.',
  },
  {
    tag: 'Next',
    title: 'Refused-Parcel Router',
    text: 'Each refused parcel takes its cheapest legal way back, starting with non-GST sellers in Uttar Pradesh.',
  },
  {
    tag: 'Later',
    title: 'Price per stop',
    text: 'Verified difficulty sets what each stop pays, and every delivery adds to Meesho’s delivery map.',
  },
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
