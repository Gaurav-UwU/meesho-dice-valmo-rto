import { createRng, hashSeed } from '../engine/rng.ts'
import type { RefusalReason } from '../engine/router.ts'
import type { SecondChanceChoice } from './types.ts'

/**
 * How the SIMULATED customer behaves once they accept a second chance. These shares are ASSUMPTIONS built into the engine (not editable on
 * the Desk); the pilot would measure the real ones. Close pilot uses them so every option gets exercised on a full day.
 */
export const OPTION_MIX: Readonly<Record<RefusalReason, readonly (readonly [SecondChanceChoice, number])[]>> = {
  no_cash: [['deliver', 0.15], ['later', 0.15], ['pay', 0.5], ['pickup', 0.2]],
  want_later: [['deliver', 0.15], ['later', 0.6], ['pay', 0.05], ['pickup', 0.2]],
  not_home: [['deliver', 0.3], ['later', 0.45], ['pay', 0.05], ['pickup', 0.2]],
  changed_mind: [['deliver', 0.5], ['later', 0.15], ['pay', 0.1], ['pickup', 0.25]],
  cheaper_elsewhere: [['deliver', 0.45], ['later', 0.15], ['pay', 0.15], ['pickup', 0.25]],
  not_ordered: [['deliver', 0.55], ['later', 0.15], ['pay', 0.1], ['pickup', 0.2]],
  damaged: [['deliver', 0.55], ['later', 0.15], ['pay', 0.1], ['pickup', 0.2]],
}

/** Share of simulated UPI payments that go through */
export const PAY_SUCCESS_SHARE = 0.9
/** Share of simulated pickups where the customer actually turns up within the window */
export const PICKUP_COLLECT_SHARE = 0.75
/** Share of "different time" answers that say tomorrow (the rest say the day after) */
const TOMORROW_SHARE = 0.7

const draw = (key: string): number => createRng(hashSeed(key)).next()

export function drawOption(reason: RefusalReason, parcelId: string): SecondChanceChoice {
  let u = draw(`option-${parcelId}`)
  for (const [choice, w] of OPTION_MIX[reason]) {
    u -= w
    if (u < 0) return choice
  }
  return OPTION_MIX[reason][OPTION_MIX[reason].length - 1][0]
}

export const drawDay = (parcelId: string): 'tomorrow' | 'day_after' => (draw(`day-${parcelId}`) < TOMORROW_SHARE ? 'tomorrow' : 'day_after')

export const paymentGoesThrough = (parcelId: string): boolean => draw(`pay-${parcelId}`) < PAY_SUCCESS_SHARE

export const pickupCollects = (parcelId: string): boolean => draw(`collect-${parcelId}`) < PICKUP_COLLECT_SHARE
