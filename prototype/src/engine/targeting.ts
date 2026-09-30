import { FLAGGED_ORDERS_PER_YEAR } from './economics.ts'

/**
 * Who gets the bonus: the riskiest X% of the day's orders by Rescue Score. Chosen before the pilot and fixed while it runs.
 * A tighter cut picks riskier orders, so fewer of them would be delivered without the bonus (a lower baseline), which lowers
 * the break-even. The price: fewer flagged orders a day (a wider range) and fewer RTOs the bonus can reach across the network.
 *
 * Baselines come from our order generator, which is calibrated to the data pack (17% RTO overall, 40% in the top 20%).
 * The 20% row is the deck's 60% ("our assumption: the riskiest 20% fail about 40% of the time, vs 17% overall; the Control group measures it").
 * The 10% row is our model, to be measured in the pilot. Only these two are offered: Pilot 2 is where a tighter cut gets tried.
 */
export const TARGET_SHARES = [10, 20] as const
export type TargetShare = (typeof TARGET_SHARES)[number]

export interface Targeting {
  /** Flagged orders delivered with no bonus, per 100 */
  readonly baselineSuccess: number
  readonly note: string
}

export const TARGETING: Readonly<Record<TargetShare, Targeting>> = {
  10: { baselineSuccess: 51, note: 'Riskiest tenth: about 49% of them fail today (our model)' },
  20: { baselineSuccess: 60, note: 'The deck default: about 40% of them fail today (data pack calibration)' },
}

export const DEFAULT_TARGET_SHARE: TargetShare = 20

/** Flagged orders per hub per day at the deck's 100 for the top 20% (500 orders a hub a day). */
const FLAGGED_PER_DAY_AT_20 = 100

export const targetingFor = (share: TargetShare): Targeting => TARGETING[share]

export const flaggedPerDayForShare = (share: TargetShare): number => (FLAGGED_PER_DAY_AT_20 * share) / DEFAULT_TARGET_SHARE

/** Flagged orders a year, scaled from the deck's 153 mn for the top 20%. */
export const flaggedPerYearForShare = (share: TargetShare): number => (FLAGGED_ORDERS_PER_YEAR * share) / DEFAULT_TARGET_SHARE

export const isTargetShare = (x: number): x is TargetShare => (TARGET_SHARES as readonly number[]).includes(x)
