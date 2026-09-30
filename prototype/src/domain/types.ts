import type { AttemptAssessment, AttemptClaim, AttemptConfidence, AttemptEvidence, CustomerAnswers } from '../engine/attempts.ts'
import type { LatLng } from '../engine/geo.ts'
import type { Inspection, RefusalReason, RefusedParcel, RouterParams, SkipReason } from '../engine/router.ts'
import type { Arm, Hub, Order, Rider } from '../engine/types.ts'
import type { DomainEvent } from './events.ts'
import type { OrderStatus } from './lifecycle.ts'

/** What the customer can tap on the order-day WhatsApp message. */
export type ReplyKind = 'home' | 'change_time' | 'fix_address' | 'pay_now'

/** Where an order is in its lifecycle. The legal moves are in `lifecycle.ts`. */
export type StopStatus = OrderStatus

export interface StopRecord {
  readonly order: Order
  /** Ground-truth RTO probability. Simulation only; never shown to riders or customers. */
  readonly pRto: number
  readonly score: number
  readonly flagged: boolean
  /** The rider who holds the order now. A re-attempt can hand it to another rider. */
  readonly riderId: string
  readonly seq: number
  readonly status: StopStatus
  /** Attempts that were made and failed (not-home / refused). The current attempt number is this plus one. */
  readonly failedAttempts: number
  /** Stamped once, at dispatch, from the rider the order was first given to. Never recomputed. */
  readonly arm?: Arm
  readonly originalRiderId?: string
  readonly replies: readonly ReplyKind[]
  readonly location?: LatLng
  readonly claim?: AttemptClaim
  readonly answers: CustomerAnswers
  readonly assessment?: AttemptAssessment
  /** What the rider's phone recorded at the door for the last failed attempt */
  readonly evidence?: AttemptEvidence
  readonly confidence?: AttemptConfidence
  /** The rider who logged the last failed attempt (the one an exception is about) */
  readonly attemptRiderId?: string
  /** Sim time of the last failed attempt: a failed order is decided at the next day's start */
  readonly failedSim?: number
  readonly deliveredAt?: number
  readonly deliveredSim?: number
  /** How many times the customer asked for another time (a cap turns the order into an RTO) */
  readonly reschedules: number
  /** Sim time a rescheduled order goes back into a bag */
  readonly rescheduledTo?: number
  /** A customer return was opened for this delivered order */
  readonly returned?: boolean
  /** The rider's cash for this delivered COD order was handed in and reconciled */
  readonly codReconciled?: boolean
  /** This delivery is an accepted second chance (its saving books only if it is delivered) */
  readonly viaSecondChance?: boolean
  /** The no-reply nudge already lowered this customer's odds once */
  readonly noReplyApplied?: boolean
  /** The customer tapped Pay now and has not yet paid or failed */
  readonly paymentPending?: boolean
  /** Reserved for the live demo: autopilot leaves it alone. */
  readonly manual: boolean
  /** Set when this stop is a re-homed parcel (buyer 2): its own cohort, outside the pilot metrics */
  readonly rehomedFrom?: string
}

export type OtpPurpose = 'delivery' | 'refusal'

export interface OtpRecord {
  readonly orderId: string
  readonly code: string
  readonly purpose: OtpPurpose
  readonly issuedAt: number
  /** Sim time it was issued: it expires 10 sim-minutes later */
  readonly issuedSim: number
  readonly attempts: number
  /** For a refusal OTP: why the customer refuses, as the rider recorded it */
  readonly refusalReason?: RefusalReason
}

export type MessageKind =
  | 'order_day'
  | 'ack'
  | 'delivery_otp'
  | 'refusal_otp'
  | 'attempt_check'
  | 'reschedule_check'
  | 'second_chance'
  | 'second_chance_when'
  | 'second_chance_pay'
  | 'second_chance_ack'
  | 'pickup_code'
  | 'pay_prompt'
  | 'customer_tap'

export interface MessageButton {
  readonly id: string
  readonly label: string
}

export interface WaMessage {
  readonly id: string
  readonly orderId: string
  readonly at: number
  /** Sim time it was sent */
  readonly simAt?: number
  readonly direction: 'out' | 'in'
  readonly kind: MessageKind
  readonly text: string
  readonly buttons?: readonly MessageButton[]
}

/** accrued (COD, cash not reconciled) -> pending (return window open) -> released; or clawed_back; or blocked at accrual */
export type LedgerStatus = 'accrued' | 'pending' | 'released' | 'clawed_back' | 'blocked'

export interface LedgerEntry {
  readonly id: string
  readonly orderId: string
  readonly riderId: string
  readonly amount: number
  readonly status: LedgerStatus
  readonly at: number
  /** Sim time of the delivery: the 7-day return window runs from here */
  readonly deliveredSim: number
  /** COD orders wait for the rider's cash to be reconciled */
  readonly cod: boolean
  /** Why it was blocked or clawed back */
  readonly reason?: string
}

export type ParcelState = 'queued' | 'second_chance_sent' | 'recovered' | 'held' | 'pickup_reserved' | 'picked_up' | 'rehomed' | 'batched'

/** What a customer picked on the second-chance WhatsApp. `later` asks "which day?"; `tomorrow` and `day_after` answer it. */
export type SecondChanceOption = 'deliver' | 'later' | 'tomorrow' | 'day_after' | 'pay' | 'pickup'

/** The option the customer finally took (for the KPIs): a different time, paying now and a pickup at the hub each end differently. */
export type SecondChanceChoice = 'deliver' | 'later' | 'pay' | 'pickup'

/** The customer asked a question the Desk is waiting on (which day? did the payment go through?) */
export type Awaiting = 'when' | 'pay'

/** A parcel waiting at the hub for its customer. The code is the customer's to show; it is verified by the operator, with 5 tries. */
export interface Pickup {
  readonly code: string
  /** Sim time the window closes */
  readonly deadline: number
  readonly reservedSim: number
  readonly tries: number
  readonly collectedSim?: number
  /** COD parcel: the operator noted the cash was collected at the hub (a flag only: no rider, no ledger) */
  readonly cashCollected?: boolean
}

export interface ParcelRecord {
  readonly id: string
  readonly orderId: string
  readonly parcel: RefusedParcel
  readonly state: ParcelState
  readonly secondChanceDeclined: boolean
  /** The 24 h offer ran out with no answer */
  readonly secondChanceExpired: boolean
  readonly secondChanceSentSim?: number
  /** What the hub operator recorded; none until they (or, for simulated riders, the bot) inspect it. Hold needs it. */
  readonly inspection?: Inspection
  /** The operator skipped the second chance for this reason (logged and counted) */
  readonly skipReason?: SkipReason
  /** Damaged or wrong item: it goes back with a "Seller claim / QC needed" chip and is never re-homed */
  readonly sellerClaim: boolean
  /** The shelf was free when the offer was sent, so the customer was offered a pickup */
  readonly pickupOffered?: boolean
  readonly choice?: SecondChanceChoice
  readonly awaiting?: Awaiting
  readonly pickup?: Pickup
  readonly heldSim?: number
  /** Sim time a buyer appears (drawn when the parcel is put on the shelf); none if nobody comes within the hold window */
  readonly matchAt?: number
  readonly newAwb?: string
  readonly rehomedStopId?: string
  readonly at: number
}

export type FeedKind = 'day' | 'flag' | 'reply' | 'deliver' | 'bonus' | 'attempt' | 'suspect' | 'refuse' | 'desk' | 'info'

export interface FeedEvent {
  readonly id: string
  readonly at: number
  readonly kind: FeedKind
  readonly text: string
  readonly orderId?: string
}

export interface DayConfig {
  /** Attempts before an order goes back as an RTO */
  readonly maxAttempts: number
  readonly bonus: number
  /** Extra share delivered for Bonus-arm riders on flagged orders (autopilot). Assumption; the pilot measures it. */
  readonly uplift: number
  readonly basePay: number
}

/** A move the lifecycle table refused. Listed on the Audit screen. */
export interface RejectedTransition {
  readonly orderId: string
  readonly from: StopStatus
  readonly to: StopStatus
  readonly reason: string
  readonly at: number
}

export type ExceptionAction = 'confirm' | 'free_reattempt' | 'strike'

/** A failed attempt Ops has to look at because its evidence is weak or the customer disputes it. */
export interface ExceptionItem {
  readonly id: string
  readonly orderId: string
  /** The rider whose attempt it is */
  readonly riderId: string
  readonly openedSim: number
  readonly confidence: AttemptConfidence
  readonly status: 'open' | 'resolved'
  readonly action?: ExceptionAction
  /** Resolved by the 24 h default, not by a person */
  readonly auto?: boolean
  readonly resolvedSim?: number
}

export interface DayState {
  /** Shape of the saved day. Bump it when the shape changes so an old saved or shared day is ignored, not half-read. */
  readonly schema: number
  /** Who this day is. A new one is made every time the day is reset, so a device can tell "my day" from "the new day". */
  readonly dayId: string
  /** 1, 2, 3 ... how many times the hub's day has been started over. The higher number is the newer day (clocks are never compared). */
  readonly dayNo: number
  /** Bumped on every applied action and never reset, even by a reset: the Live store uses it for optimistic concurrency. */
  readonly version: number
  readonly hub: Hub
  readonly seed: number
  readonly started: boolean
  readonly config: DayConfig
  /** Simulated time in ms. Day 1 starts at 08:00. Every timer runs on this clock. */
  readonly simNow: number
  readonly riders: readonly Rider[]
  readonly stopOrder: readonly string[]
  readonly stops: Readonly<Record<string, StopRecord>>
  readonly otps: Readonly<Record<string, OtpRecord>>
  readonly messages: readonly WaMessage[]
  readonly ledger: readonly LedgerEntry[]
  readonly parcels: readonly ParcelRecord[]
  readonly feed: readonly FeedEvent[]
  /** The append-only typed event log. The feed above is the human-readable view. */
  readonly events: readonly DomainEvent[]
  readonly exceptions: readonly ExceptionItem[]
  /** Confirmed fake attempts per rider */
  readonly strikes: Readonly<Record<string, number>>
  readonly rejectedTransitions: readonly RejectedTransition[]
  /** Router assumptions, editable on the Desk */
  readonly router: RouterParams
  /** Hash of the decision rule when the day started (the pilot verdict is INVALID if the rule changes after this). */
  readonly plannedRuleHash?: string
  readonly nextId: number
}

/** A Router assumption an operator can edit on the Desk. */
/** `accept_soft` sets the three soft-refusal rates (no cash, wants it later, not home) at once. */
export type RouterParamKey = 'conversion' | 'shelfCapacity' | 'accept_soft' | `accept_${RefusalReason}`

export type Action =
  | { readonly type: 'startDay'; readonly at: number }
  | { readonly type: 'customerReply'; readonly at: number; readonly orderId: string; readonly reply: ReplyKind; readonly location?: LatLng }
  | { readonly type: 'customerPayment'; readonly at: number; readonly orderId: string; readonly ok: boolean }
  | { readonly type: 'riderDeliver'; readonly at: number; readonly orderId: string; readonly code: string }
  | { readonly type: 'submitOtp'; readonly at: number; readonly orderId: string; readonly code: string }
  | { readonly type: 'riderAttempt'; readonly at: number; readonly orderId: string; readonly claim: AttemptClaim; readonly evidence?: AttemptEvidence }
  | { readonly type: 'customerReach'; readonly at: number; readonly orderId: string; readonly reached: boolean }
  | { readonly type: 'customerAskedReschedule'; readonly at: number; readonly orderId: string; readonly asked: boolean }
  | { readonly type: 'riderRefuse'; readonly at: number; readonly orderId: string; readonly code: string; readonly reason?: RefusalReason }
  | { readonly type: 'deskSecondChance'; readonly at: number; readonly parcelId: string }
  /** Hub operator: record what is really in front of them. Hold needs it; a second chance and a consolidated return do not. */
  | { readonly type: 'deskInspect'; readonly at: number; readonly parcelId: string; readonly unopened: boolean; readonly sealOk: boolean; readonly invoiceOutside: boolean; readonly photoNote?: string; readonly by?: 'operator' | 'bot' }
  | { readonly type: 'deskSkipSecondChance'; readonly at: number; readonly parcelId: string; readonly reason: SkipReason }
  | { readonly type: 'customerSecondChance'; readonly at: number; readonly parcelId: string; readonly accept: boolean; readonly option?: SecondChanceOption }
  /** Hub operator: the customer is at the counter with their pickup code */
  | { readonly type: 'deskHandover'; readonly at: number; readonly parcelId: string; readonly code: string; readonly cashCollected?: boolean }
  | { readonly type: 'deskSetParam'; readonly at: number; readonly param: RouterParamKey; readonly value: number }
  | { readonly type: 'deskHold'; readonly at: number; readonly parcelId: string }
  /** Demo shortcut: a buyer for the held parcel appears now (otherwise one appears, or not, on the clock) */
  | { readonly type: 'deskMatch'; readonly at: number; readonly parcelId: string }
  | { readonly type: 'deskConsolidate'; readonly at: number; readonly parcelId: string }
  /** Try a failed (not-home) order again, if an attempt is left and it pays. `riderId` hands it to another rider of the same arm. */
  | { readonly type: 'reattempt'; readonly at: number; readonly orderId: string; readonly riderId?: string }
  /** A rescheduled order's new time has arrived: back into the bag (override; normally the clock does this). */
  | { readonly type: 'dispatchNextDay'; readonly at: number; readonly orderId: string }
  /** Ops decision on a disputed attempt */
  | { readonly type: 'resolveException'; readonly at: number; readonly orderId: string; readonly action: ExceptionAction }
  /** A customer return is opened on a delivered order: inside the 7-day window the bonus is clawed back */
  | { readonly type: 'openReturn'; readonly at: number; readonly orderId: string }
  /** Hub button: reconcile the riders' cash now instead of at 20:00 */
  | { readonly type: 'reconcileCod'; readonly at: number }
  /** Move the sim clock on and fire every timer that is due */
  | { readonly type: 'advanceClock'; readonly at: number; readonly minutes: number }
  /** Jump to 08:00 the next day: rescheduled orders return, failed attempts are retried or closed */
  | { readonly type: 'advanceDay'; readonly at: number }
  /** Same as advanceDay (kept for the Ops "Next day" button) */
  | { readonly type: 'nextDay'; readonly at: number }
  /** Run the rest of the pilot: work every open order, run the Desk on the Router's advice, and advance past every window */
  | { readonly type: 'closePilot'; readonly at: number }
