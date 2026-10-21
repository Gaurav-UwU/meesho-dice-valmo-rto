import { createRng, hashSeed } from '../engine/rng.ts'
import type { RefusalReason } from '../engine/router.ts'
import type { SecondChanceWhen } from './types.ts'

/**
 * How the SIMULATED customer answers each step once they accept a second chance. These shares are ASSUMPTIONS built into the engine (not
 * editable on the Desk); the pilot would measure the real ones. They carry over the old option mix: a pickup share, then for a delivery
 * the share who want it today (the rest pick a later day), and the share of COD customers who pay by UPI.
 */
export interface AnswerMix {
  readonly pickup: number
  readonly today: number
  readonly upi: number
}

export const ANSWER_MIX: Readonly<Record<RefusalReason, AnswerMix>> = {
  no_cash: { pickup: 0.2, today: 0.81, upi: 0.62 },
  want_later: { pickup: 0.2, today: 0.25, upi: 0.06 },
  not_home: { pickup: 0.2, today: 0.44, upi: 0.06 },
  changed_mind: { pickup: 0.25, today: 0.8, upi: 0.13 },
  cheaper_elsewhere: { pickup: 0.25, today: 0.8, upi: 0.2 },
  not_ordered: { pickup: 0.2, today: 0.81, upi: 0.12 },
  damaged: { pickup: 0.2, today: 0.81, upi: 0.12 },
  other: { pickup: 0.2, today: 0.5, upi: 0.2 },
}

/** Share of simulated customers who share their exact location at the address step (an assumption) */
export const SHARE_LOCATION_SHARE = 0.15

/** Share of simulated UPI payments that go through */
export const PAY_SUCCESS_SHARE = 0.9
/** Share of simulated pickups where the customer actually turns up within the window */
export const PICKUP_COLLECT_SHARE = 0.75
/** Share of later-day answers that say tomorrow (the rest say the day after) */
const TOMORROW_SHARE = 0.7

const draw = (key: string): number => createRng(hashSeed(key)).next()

/** Step 1 for a customer who accepted: a delivery or a pickup at the hub */
export const drawOutcome = (reason: RefusalReason, parcelId: string): 'deliver' | 'pickup' => (draw(`outcome-${parcelId}`) < ANSWER_MIX[reason].pickup ? 'pickup' : 'deliver')

/** Step 2: today, or a later day (tomorrow more often than the day after) */
export function drawWhen(reason: RefusalReason, parcelId: string): SecondChanceWhen {
  if (draw(`when-${parcelId}`) < ANSWER_MIX[reason].today) return 'today'
  return draw(`day-${parcelId}`) < TOMORROW_SHARE ? 'tomorrow' : 'day_after'
}

/** Step 3 (COD only): pays now by UPI rather than cash on delivery */
export const paysByUpi = (reason: RefusalReason, parcelId: string): boolean => draw(`method-${parcelId}`) < ANSWER_MIX[reason].upi

/** Step 4: shares the exact location rather than keeping the address */
export const sharesLocation = (parcelId: string): boolean => draw(`where-${parcelId}`) < SHARE_LOCATION_SHARE

export const paymentGoesThrough = (parcelId: string): boolean => draw(`pay-${parcelId}`) < PAY_SUCCESS_SHARE

export const pickupCollects = (parcelId: string): boolean => draw(`collect-${parcelId}`) < PICKUP_COLLECT_SHARE
